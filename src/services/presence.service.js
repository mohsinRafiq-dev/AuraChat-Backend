/**
 * In-memory map of connected sockets per user.
 * Survives for the lifetime of the Node process (use Redis adapter for horizontal scale).
 */
class PresenceRegistry {
  constructor() {
    /** @type {Map<string, Set<string>>} userId -> socket ids */
    this.userSockets = new Map();
    /** @type {Map<string, string>} socketId -> userId */
    this.socketUsers = new Map();
  }

  addSocket(userId, socketId) {
    const uid = String(userId);
    if (!this.userSockets.has(uid)) {
      this.userSockets.set(uid, new Set());
    }
    this.userSockets.get(uid).add(socketId);
    this.socketUsers.set(socketId, uid);
  }

  removeSocket(socketId) {
    const uid = this.socketUsers.get(socketId);
    if (!uid) return;
    this.socketUsers.delete(socketId);
    const set = this.userSockets.get(uid);
    if (!set) return;
    set.delete(socketId);
    if (set.size === 0) {
      this.userSockets.delete(uid);
    }
  }

  isUserOnline(userId) {
    const set = this.userSockets.get(String(userId));
    return Boolean(set && set.size > 0);
  }

  getSocketCountForUser(userId) {
    return this.userSockets.get(String(userId))?.size ?? 0;
  }
}

export const presenceRegistry = new PresenceRegistry();
