export function generateRoomId(): string {
  const hex = crypto.randomUUID().replace(/-/g, '');
  return `${hex.slice(0, 3)}-${hex.slice(3, 7)}-${hex.slice(7, 10)}`;
}

export function normalizeRoomInput(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? '';
  } catch {
    return trimmed;
  }
}
