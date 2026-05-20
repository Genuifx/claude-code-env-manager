export function isMarkdownCodeBlock(codeClassName: string | undefined, rawCodeString: string) {
  return Boolean(codeClassName) || /[\r\n]/.test(rawCodeString);
}
