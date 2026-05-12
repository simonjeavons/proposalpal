const BLOCK_START = /^\s*<(p|ul|ol|div|h[1-6])\b/i;

export function plainToNdaHtml(input: string | null | undefined): string {
  if (!input) return '';
  if (BLOCK_START.test(input)) return input;
  const normalised = input.replace(/\r\n/g, '\n');
  const paragraphs = normalised.split(/\n\n/);
  return paragraphs
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('');
}
