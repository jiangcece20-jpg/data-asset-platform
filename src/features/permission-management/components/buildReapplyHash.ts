export function buildReapplyHash(assetName: string, reason?: string): string {
  const params = new URLSearchParams({ section: 'cart', assetName });
  if (reason && reason.trim()) params.set('reason', reason);
  return `my?${params.toString()}`;
}
