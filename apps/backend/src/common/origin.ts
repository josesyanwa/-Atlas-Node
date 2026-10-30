export function normalizeOrigin(url: string): string {
  return new URL(url).origin;
}
