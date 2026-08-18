import { GoogleGenAI } from '@google/genai';
import { env } from '../config/env.js';
import { Message } from '../models/Message.model.js';
import { AppError } from '../utils/AppError.js';
import { AURA_SYSTEM, TASKS, renderTranscript } from '../prompts/aura.prompt.js';
import { findConversationForUser } from './conversation.service.js';

let client = null;

/** Lazily constructed so the server still boots when no key is configured. */
function getClient() {
  if (!env.geminiApiKey) {
    throw AppError.badRequest('Aura is not configured on this server (GEMINI_API_KEY is unset)');
  }
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.geminiApiKey });
  }
  return client;
}

export function isAssistantConfigured() {
  return Boolean(env.geminiApiKey);
}

/** How much history each task reads. Chat context is cheap; unbounded context is not. */
const TASK_WINDOW = {
  catchUp: 60,
  ask: 80,
  draft: 25
};

/**
 * Loads the recent transcript for a conversation the user is actually a member of.
 * Membership is re-checked here rather than trusted from the socket payload.
 */
async function loadTranscript(conversationId, userId, limit) {
  // Throws AppError.notFound when the user is not a participant.
  const conversation = await findConversationForUser(conversationId, userId);

  const rows = await Message.find({
    conversationId,
    deletedForEveryone: { $ne: true },
    // Respect per-user deletes — Aura must not surface what the viewer removed.
    deletedFor: { $ne: userId }
  })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('senderId', 'username email')
    .lean();

  const messages = rows
    .reverse()
    .filter((m) => typeof m.text === 'string' && m.text.trim().length > 0)
    .map((m) => ({
      senderName: m.senderId?.username || m.senderId?.email?.split('@')[0] || 'Unknown',
      text: m.text,
      createdAt: m.createdAt
    }));

  return { conversation, messages };
}

/**
 * Runs an Aura task and streams the reply out through `onDelta`.
 *
 * Streaming is deliberate: the reply lands token-by-token in the bubble, the
 * same way a typing indicator resolves into a message, so the assistant reads
 * as a participant rather than a panel.
 *
 * @param {object} params
 * @param {'catchUp'|'ask'|'draft'} params.task
 * @param {string} params.conversationId
 * @param {string} params.userId
 * @param {string} params.viewerName
 * @param {string} [params.question] - required for the `ask` task
 * @param {(delta: string) => void} params.onDelta
 * @returns {Promise<{text: string, messageCount: number}>}
 */
export async function runAuraTask({ task, conversationId, userId, viewerName, question, onDelta }) {
  const instruction = TASKS[task];
  if (!instruction) {
    throw AppError.badRequest(`Unknown assistant task: ${task}`);
  }
  if (task === 'ask' && !question?.trim()) {
    throw AppError.badRequest('A question is required');
  }

  const ai = getClient();
  const { messages } = await loadTranscript(conversationId, userId, TASK_WINDOW[task]);

  if (messages.length === 0) {
    return { text: "There aren't any messages here yet.", messageCount: 0 };
  }

  const parts = [renderTranscript(messages, viewerName), '', instruction];
  if (task === 'ask') {
    parts.push('', `QUESTION FROM ${viewerName}: ${question.trim()}`);
  }

  const stream = await ai.models.generateContentStream({
    model: env.geminiModel,
    contents: parts.join('\n'),
    config: {
      systemInstruction: AURA_SYSTEM,
      maxOutputTokens: 700,
      temperature: 0.4
    }
  });

  let text = '';
  for await (const chunk of stream) {
    const delta = chunk.text;
    if (delta) {
      text += delta;
      onDelta?.(delta);
    }
  }

  return { text: text.trim(), messageCount: messages.length };
}
