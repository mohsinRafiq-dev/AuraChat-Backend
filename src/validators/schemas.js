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
/**
 * Media is currently inlined as a base64 data URL rather than uploaded to
 * object storage, so the ceiling here is what a single Mongo document can
 * comfortably carry. ~2MB of binary becomes ~2.7MB of base64; the cap leaves
 * headroom under the 16MB document limit and under the socket buffer.
 */
const MAX_MEDIA_URL = 3_000_000;

export const sendMessageSocketSchema = z
  .object({
    conversationId: z.string().min(1),
    recipientId: z.string().min(1),
    senderId: z.string().optional(),
    // Not `.min(1)`: a voice note or a photo without a caption is a valid
    // message. Requiring text made every media-only send fail validation.
    text: z.string().trim().max(8000).optional().default(''),
    clientId: z.string().trim().max(128).optional(),
    createdAt: z.union([z.string(), z.date()]).optional(),

    // These were absent from the schema entirely, so `.parse()` stripped them
    // and media never reached the service — which has always accepted them.
    type: z
      .enum(['text', 'image', 'video', 'audio', 'file', 'location', 'contact', 'sticker', 'voice'])
      .optional(),
    mediaUrl: z.string().trim().max(MAX_MEDIA_URL).optional(),
    mediaThumbnail: z.string().trim().max(MAX_MEDIA_URL).optional(),
    mediaType: z.string().trim().max(128).optional(),
    mediaName: z.string().trim().max(256).optional(),
    mediaSize: z.number().int().nonnegative().optional(),
    mediaDuration: z.number().nonnegative().optional(),
    replyTo: z.string().trim().max(64).optional()
  })
  .refine((d) => (d.text && d.text.length > 0) || Boolean(d.mediaUrl), {
    message: 'A message must have text or media',
    path: ['text']
  });

export const updateProfileSchema = z.object({
  avatarUrl: z.string().trim().min(1).max(10000)
});

export const typingSocketSchema = z.object({
  conversationId: z.string().min(1),
  isTyping: z.boolean()
});
