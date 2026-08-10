export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .normalize('NFKC')
    .replace(/\s+/g, ' ') // Collapse all whitespace, tabs, newlines into a single space
    .trim();
}

export function verifyQuote(sourceText: string, quote: string): boolean {
  const normSource = normalizeText(sourceText);
  const normQuote = normalizeText(quote);
  
  if (!normQuote) return false;
  
  return normSource.includes(normQuote);
}
