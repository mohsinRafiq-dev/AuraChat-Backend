import { z } from 'zod';

export const registerSchema = z.object({
  email: z.string().trim().email().max(320),
  password: z.string().min(8).max(128),
  username: z.string().trim().max(64).optional()
});

export const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(1).max(128)
});

/** Google Identity Services / @react-oauth/google credential (JWT id_token). */
export const googleCredentialSchema = z.object({
  credential: z.string().min(20)
});

export const createConversationSchema = z
  .object({
    participantId: z.string().min(1).optional(),
    participantEmail: z.string().trim().email().optional()
  })
  .refine((d) => Boolean(d.participantId?.trim()) || Boolean(d.participantEmail?.trim()), {
    message: 'Provide participantId or participantEmail'
  });

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
  /** Oldest message `_id` the client already has — fetch older history. */
  before: z.string().trim().min(1).optional()
});

/** Payload from the browser for `send_message` (after socket auth, sender is trusted). */
export const sendMessageSocketSchema = z.object({
  conversationId: z.string().min(1),
  recipientId: z.string().min(1),
  senderId: z.string().optional(),
  text: z.string().trim().min(1).max(8000),
  clientId: z.string().trim().max(128).optional(),
  createdAt: z.union([z.string(), z.date()]).optional()
});

export const updateProfileSchema = z.object({
  avatarUrl: z.string().trim().min(1).max(10000)
});

export const typingSocketSchema = z.object({
  conversationId: z.string().min(1),
  isTyping: z.boolean()
});
