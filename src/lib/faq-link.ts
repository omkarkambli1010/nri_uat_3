// Encodes/decodes a return path into a hex string for the /faq?faq=… query
// param. Hex (no atob/btoa) so the value looks opaque in the URL but stays
// reversible. Used when a "Need Help?" button on any page sends the user to
// /faq — the FAQ back button reverses it to navigate back to the source page.

export const encodeReturnPath = (path: string): string =>
  Array.from(path)
    .map((ch) => ch.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('');

export const decodeReturnPath = (hex: string): string | null => {
  if (!hex || hex.length % 2 !== 0 || !/^[0-9a-f]+$/i.test(hex)) return null;
  let out = '';
  for (let i = 0; i < hex.length; i += 2) {
    out += String.fromCharCode(parseInt(hex.substring(i, i + 2), 16));
  }
  return out;
};

export const buildFaqUrl = (returnPath: string): string =>
  `/faq?faq=${encodeReturnPath(returnPath)}`;
