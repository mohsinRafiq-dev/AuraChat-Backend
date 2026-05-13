export const SOCKET_EVENTS = {
  // Messaging
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  MARK_READ: 'mark_read',
  // Edit & Delete
  EDIT_MESSAGE: 'edit_message',
  MESSAGE_EDITED: 'message_edited',
  DELETE_MESSAGE: 'delete_message',
  MESSAGE_DELETED: 'message_deleted',
  // Reactions
  REACT_MESSAGE: 'react_message',
  MESSAGE_REACTED: 'message_reacted',
  // Typing
  TYPING_START: 'typing_start',
  TYPING_STOP: 'typing_stop',
  TYPING: 'typing',  // legacy
  // Presence
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_PRESENCE_SNAPSHOT: 'user:presence_snapshot',
  USER_LAST_SEEN: 'user:last_seen',
  // Group events
  GROUP_CREATED: 'group:created',
  GROUP_UPDATED: 'group:updated',
  GROUP_MEMBER_ADDED: 'group:member_added',
  GROUP_MEMBER_REMOVED: 'group:member_removed',
  GROUP_ADMIN_CHANGED: 'group:admin_changed',
  GROUP_LEFT: 'group:left',
  // Pinning / Starring
  MESSAGE_PINNED: 'message_pinned',
  MESSAGE_UNPINNED: 'message_unpinned',
  MESSAGE_STARRED: 'message_starred',
  // Calls (WebRTC)
  CALL_INVITE: 'call:invite',
  CALL_ACCEPT: 'call:accept',
  CALL_REJECT: 'call:reject',
  CALL_END: 'call:end',
  CALL_ICE_CANDIDATE: 'call:ice_candidate',
  CALL_SDP_OFFER: 'call:sdp_offer',
  CALL_SDP_ANSWER: 'call:sdp_answer',
  // Misc
  SYNC_CONVERSATIONS: 'sync_conversations',
  HEARTBEAT: 'heartbeat'
};
