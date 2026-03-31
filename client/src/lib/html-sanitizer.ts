import DOMPurify from "dompurify";

/**
 * Limites de tamanho para HTML importado
 */
export const HTML_SIZE_LIMITS = {
  /** Tamanho máximo do HTML em bytes (2MB) */
  MAX_SIZE_BYTES: 2 * 1024 * 1024,
  /** Tamanho máximo do HTML em caracteres para exibir no textarea */
  MAX_DISPLAY_CHARS: 2_000_000,
  /** Tamanho máximo formatado para exibição ao utilizador */
  MAX_SIZE_LABEL: "2 MB",
};

/**
 * Sanitiza HTML para preview seguro no browser.
 * Remove scripts, iframes, objetos embeddados, event handlers, etc.
 * Mantém apenas tags e atributos seguros para e-mail marketing.
 */
export function sanitizeHtmlForPreview(html: string): string {
  return DOMPurify.sanitize(html, {
    // Permitir tags comuns de e-mail
    ALLOWED_TAGS: [
      "html", "head", "body", "meta", "title", "style", "link",
      "div", "span", "p", "br", "hr",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "a", "img",
      "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption", "colgroup", "col",
      "ul", "ol", "li",
      "b", "i", "u", "strong", "em", "s", "strike", "sub", "sup", "small", "big",
      "blockquote", "pre", "code",
      "center", "font",
      "section", "article", "header", "footer", "nav", "main", "aside",
      "figure", "figcaption",
    ],
    // Permitir atributos comuns de e-mail
    ALLOWED_ATTR: [
      "style", "class", "id", "width", "height", "align", "valign",
      "bgcolor", "background", "border", "cellpadding", "cellspacing",
      "src", "alt", "title", "href", "target", "rel",
      "color", "size", "face",
      "colspan", "rowspan",
      "dir", "lang",
      "role", "aria-label", "aria-hidden",
      "http-equiv", "content", "charset", "name",
    ],
    // Bloquear tudo que é perigoso
    FORBID_TAGS: ["script", "iframe", "object", "embed", "applet", "form", "input", "button", "select", "textarea"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onsubmit", "onchange"],
    // Permitir data URIs para imagens inline
    ADD_DATA_URI_TAGS: ["img"],
    // Manter o HTML completo (incluindo <html>, <head>, <body>)
    WHOLE_DOCUMENT: true,
    // Não adicionar tags de fechamento desnecessárias
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
  });
}

/**
 * Sanitiza HTML para envio ao servidor.
 * Menos restritivo que o preview - mantém estilos inline e estrutura completa.
 * Remove apenas scripts e elementos perigosos que podem causar problemas no envio.
 */
export function sanitizeHtmlForSend(html: string): string {
  return DOMPurify.sanitize(html, {
    // Permitir quase tudo exceto scripts e interactivos
    FORBID_TAGS: ["script", "iframe", "object", "embed", "applet", "form", "input", "button", "select", "textarea"],
    FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover", "onfocus", "onblur", "onsubmit", "onchange"],
    WHOLE_DOCUMENT: false,
    ADD_DATA_URI_TAGS: ["img"],
  });
}

/**
 * Valida o tamanho do HTML importado.
 * Retorna um objeto com o resultado da validação.
 */
export function validateHtmlSize(html: string): {
  valid: boolean;
  sizeBytes: number;
  sizeFormatted: string;
  message?: string;
} {
  const sizeBytes = new Blob([html]).size;
  const sizeFormatted = formatFileSize(sizeBytes);

  if (sizeBytes > HTML_SIZE_LIMITS.MAX_SIZE_BYTES) {
    return {
      valid: false,
      sizeBytes,
      sizeFormatted,
      message: `O arquivo HTML é muito grande (${sizeFormatted}). O tamanho máximo permitido é ${HTML_SIZE_LIMITS.MAX_SIZE_LABEL}.`,
    };
  }

  return { valid: true, sizeBytes, sizeFormatted };
}

/**
 * Formata tamanho de ficheiro em bytes para string legível.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Conta elementos perigosos removidos do HTML.
 * Útil para mostrar feedback ao utilizador.
 */
export function countDangerousElements(html: string): {
  scripts: number;
  iframes: number;
  eventHandlers: number;
  total: number;
} {
  const scripts = (html.match(/<script[\s>]/gi) || []).length;
  const iframes = (html.match(/<iframe[\s>]/gi) || []).length;
  const eventHandlers = (html.match(/\bon\w+\s*=/gi) || []).length;
  const total = scripts + iframes + eventHandlers;
  return { scripts, iframes, eventHandlers, total };
}
