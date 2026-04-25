/**
 * Keep names aligned with the React client (`frontend/src/services/socketEvents.js`).
 */
export const SOCKET_EVENTS = {
  SEND_MESSAGE: 'send_message',
  RECEIVE_MESSAGE: 'receive_message',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  MARK_READ: 'mark_read',
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',
  USER_PRESENCE_SNAPSHOT: 'user:presence_snapshot',
  TYPING: 'typing',
  HEARTBEAT: 'heartbeat'
};
