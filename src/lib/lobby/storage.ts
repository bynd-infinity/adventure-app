const key = (sessionId: string) => `adventure-player:${sessionId}`;

export function getStoredPlayerId(sessionId: string): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(key(sessionId));
}

export function setStoredPlayerId(sessionId: string, playerId: string): void {
  window.localStorage.setItem(key(sessionId), playerId);
}
