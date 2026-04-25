/**
 * Stable JSON shapes for the API / sockets (string ids for client compatibility).
 */
export function serializeUser(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    id: String(o._id),
    email: o.email,
    username: o.username ?? null,
    avatarUrl: o.avatarUrl ?? null
  };
}

export function serializeMessage(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  return {
    _id: String(o._id),
    id: String(o._id),
    conversationId: String(o.conversationId),
    senderId: String(o.senderId),
    recipientId: String(o.recipientId),
    text: o.text,
    clientId: o.clientId ?? undefined,
    createdAt: o.createdAt?.toISOString?.() ?? o.createdAt,
    status: o.readAt ? 'read' : o.deliveredAt ? 'delivered' : 'sent'
  };
}

export function serializeConversation(doc, currentUserId) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const participants = (o.participants || []).map((p) => serializeUser(p));
  const peer =
    participants.find((p) => p.id !== String(currentUserId)) ?? participants[0] ?? null;
  return {
    _id: String(o._id),
    participants,
    peer,
    unreadCount: o.unreadCount ?? 0,
    lastMessage: o.lastMessage?.text
      ? {
          text: o.lastMessage.text,
          senderId: o.lastMessage.senderId ? String(o.lastMessage.senderId) : undefined,
          createdAt:
            o.lastMessage.createdAt instanceof Date
              ? o.lastMessage.createdAt.toISOString()
              : o.lastMessage.createdAt
        }
      : null
  };
}
