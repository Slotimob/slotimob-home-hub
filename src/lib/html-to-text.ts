/**
 * Utilitário neutro de conversão HTML -> texto puro.
 *
 * Vive em `src/lib` (e não no componente de editor) porque o gerador de PDF
 * depende dele: qualquer conteúdo vindo do editor rico precisa ser
 * normalizado antes de entrar no `fillTemplateContent`.
 */

/** Heurística simples: o conteúdo parece HTML produzido pelo editor rico? */
export const looksLikeHtml = (value: string): boolean => {
  if (!value) return false;
  return /<\/?(p|br|div|h[1-6]|ul|ol|li|strong|em|b|i|span|table)\b[^>]*>/i.test(value);
};

/**
 * Converte HTML em texto puro preservando quebras de linha e marcadores de
 * lista. Usado nas fronteiras com geradores que esperam texto (ex.: PDF).
 */
export const htmlToPlainText = (html: string): string => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const walk = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    const children = Array.from(el.childNodes).map(walk).join('');

    switch (tag) {
      case 'p':
        return `${children}\n`;
      case 'br':
        return '\n';
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        return `${children}\n`;
      case 'li': {
        const parentTag = el.parentElement?.tagName.toLowerCase();
        if (parentTag === 'ol') {
          const index = Array.from(el.parentElement!.children).indexOf(el) + 1;
          return `${index}. ${children}\n`;
        }
        return `• ${children}\n`;
      }
      case 'ul':
      case 'ol':
        return children.endsWith('\n') ? children : `${children}\n`;
      default:
        return children;
    }
  };

  return Array.from(doc.body.childNodes)
    .map(walk)
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/** Converte apenas quando o conteúdo é HTML; texto puro passa intacto. */
export const normalizeToPlainText = (value: string): string =>
  looksLikeHtml(value) ? htmlToPlainText(value) : value;
