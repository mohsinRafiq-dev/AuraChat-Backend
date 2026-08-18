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
    avatarUrl: o.avatarUrl ?? null,
    bio: o.bio ?? null,
    statusMessage: o.statusMessage ?? null,
    lastSeen: o.lastSeen ? (o.lastSeen instanceof Date ? o.lastSeen.toISOString() : o.lastSeen) : null,
    phone: o.phone ?? null
  };
}

export function serializeMessage(doc) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;

  let status = 'sent';
  if (o.readAt) status = 'read';
  else if (o.deliveredAt) status = 'delivered';

  return {
    _id: String(o._id),
    id: String(o._id),
    conversationId: String(o.conversationId),
    senderId: String(o.senderId),
    recipientId: o.recipientId ? String(o.recipientId) : null,
    text: o.isDeleted ? 'This message was deleted' : (o.text ?? ''),
    clientId: o.clientId ?? undefined,
    createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    status,
    type: o.type ?? 'text',
    mediaUrl: o.mediaUrl ?? null,
    mediaThumbnail: o.mediaThumbnail ?? null,
    mediaType: o.mediaType ?? null,
    mediaSize: o.mediaSize ?? null,
    mediaName: o.mediaName ?? null,
    mediaDuration: o.mediaDuration ?? null,
    replyTo: o.replyTo
      ? {
          messageId: o.replyTo.messageId ? String(o.replyTo.messageId) : null,
          senderId: o.replyTo.senderId ? String(o.replyTo.senderId) : null,
          text: o.replyTo.text ?? null,
          type: o.replyTo.type ?? 'text',
          mediaUrl: o.replyTo.mediaUrl ?? null,
          mediaType: o.replyTo.mediaType ?? null
        }
      : null,
    forwardedFrom: o.forwardedFrom ? String(o.forwardedFrom) : null,
    isForwarded: o.isForwarded ?? false,
    editedAt: o.editedAt ? (o.editedAt instanceof Date ? o.editedAt.toISOString() : o.editedAt) : null,
    isDeleted: o.isDeleted ?? false,
    deletedForEveryone: o.deletedForEveryone ?? false,
    reactions: (o.reactions || []).map((r) => ({
      userId: String(r.userId),
      emoji: r.emoji
    })),
    starredBy: (o.starredBy || []).map((id) => String(id)),
    isPinned: o.isPinned ?? false
  };
}

export function serializeConversation(doc, currentUserId) {
  if (!doc) return null;
  const o = doc.toObject ? doc.toObject() : doc;
  const participants = (o.participants || []).map((p) => serializeUser(p));
  const currentIdStr = String(currentUserId);

  const isGroup = o.isGroup ?? false;
  const peer = isGroup
    ? null
    : (participants.find((p) => p.id !== currentIdStr) ?? participants[0] ?? null);

  const displayName = isGroup ? (o.groupName ?? 'Group') : (peer?.username ?? peer?.email ?? null);

  return {
    _id: String(o._id),
    id: String(o._id),
    participants,
    peer,
    isGroup,
    groupName: o.groupName ?? null,
    groupAvatar: o.groupAvatar ?? null,
    groupDescription: o.groupDescription ?? null,
    displayName,
    admins: (o.admins || []).map((id) => String(id)),
    archivedBy: (o.archivedBy || []).map((id) => String(id)),
    pinnedMessages: (o.pinnedMessages || []).map((id) => String(id)),
    disappearingMessages: o.disappearingMessages
      ? {
          enabled: o.disappearingMessages.enabled ?? false,
          duration: o.disappearingMessages.duration ?? 86400
        }
      : { enabled: false, duration: 86400 },
    unreadCount: o.unreadCount ?? 0,
    lastMessage: o.lastMessage
      ? {
          text: o.lastMessage.text ?? '',
          type: o.lastMessage.type ?? 'text',
          senderId: o.lastMessage.senderId ? String(o.lastMessage.senderId) : undefined,
          messageId: o.lastMessage.messageId ? String(o.lastMessage.messageId) : null,
          status: o.lastMessage.status ?? 'sent',
          createdAt:
            o.lastMessage.createdAt instanceof Date
              ? o.lastMessage.createdAt.toISOString()
              : o.lastMessage.createdAt
        }
      : null,
    updatedAt: o.updatedAt instanceof Date ? o.updatedAt.toISOString() : o.updatedAt
  };
}
