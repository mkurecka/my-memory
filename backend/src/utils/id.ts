// Generate unique IDs using crypto.randomUUID()
export function generateId(): string {
  return crypto.randomUUID();
}

// Generate short ID for display purposes
export function generateShortId(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map(x => chars[x % chars.length])
    .join('');
}
