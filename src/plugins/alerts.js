/**
 * Plugin de Alertas y Callouts estilo GitHub para markdown-it
 * Soporta [!NOTE], [!TIP], [!IMPORTANT], [!WARNING], [!CAUTION]
 */

const ALERT_CONFIG = {
  note: {
    title: 'Nota',
    className: 'callout-note',
    icon: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8Zm8-6.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM6.5 7.75A.75.75 0 0 1 7.25 7h1a.75.75 0 0 1 .75.75v2.75h.25a.75.75 0 0 1 0 1.5h-2a.75.75 0 0 1 0-1.5h.25v-2h-.25a.75.75 0 0 1-.75-.75ZM8 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2Z"></path></svg>`
  },
  tip: {
    title: 'Consejo',
    className: 'callout-tip',
    icon: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M8 1.5c-2.363 0-4 1.69-4 3.75 0 .984.424 1.625.984 2.304l.214.253c.223.264.47.556.673.848.284.411.537.896.621 1.49a.75.75 0 0 1-1.484.211c-.04-.282-.163-.547-.37-.847a8.456 8.456 0 0 0-.542-.68c-.084-.1-.173-.205-.268-.32C3.201 7.75 2.5 6.766 2.5 5.25 2.5 2.31 4.863 0 8 0s5.5 2.31 5.5 5.25c0 1.516-.701 2.5-1.328 3.259-.095.115-.184.22-.268.319-.18.213-.362.434-.541.681-.208.3-.33.565-.371.847a.751.751 0 0 1-1.485-.212c.084-.593.337-1.078.621-1.489.203-.292.45-.584.673-.848.075-.088.147-.173.213-.253.561-.679.985-1.32.985-2.304 0-2.06-1.637-3.75-4-3.75ZM5.75 12h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1 0-1.5Zm1 3h2.5a.75.75 0 0 1 0 1.5h-2.5a.75.75 0 0 1 0-1.5Z"></path></svg>`
  },
  important: {
    title: 'Importante',
    className: 'callout-important',
    icon: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M0 1.75C0 .784.784 0 1.75 0h12.5C15.216 0 16 .784 16 1.75v9.5A1.75 1.75 0 0 1 14.25 13H8.06l-2.573 2.573A1.458 1.458 0 0 1 3 14.543V13H1.75A1.75 1.75 0 0 1 0 11.25Zm1.75-.25a.25.25 0 0 0-.25.25v9.5c0 .138.112.25.25.25h2a.75.75 0 0 1 .75.75v2.19l2.72-2.72a.749.749 0 0 1 .53-.22h6.5a.25.25 0 0 0 .25-.25v-9.5a.25.25 0 0 0-.25-.25Zm7 2.25v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 9a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>`
  },
  warning: {
    title: 'Advertencia',
    className: 'callout-warning',
    icon: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M6.457 1.047c.659-1.234 2.427-1.234 3.086 0l6.082 11.378A1.75 1.75 0 0 1 14.082 15H1.918a1.75 1.75 0 0 1-1.543-2.575Zm1.763.707a.25.25 0 0 0-.44 0L1.698 13.132a.25.25 0 0 0 .22.368h12.164a.25.25 0 0 0 .22-.368Zm.53 3.996v2.5a.75.75 0 0 1-1.5 0v-2.5a.75.75 0 0 1 1.5 0ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>`
  },
  caution: {
    title: 'Precaución',
    className: 'callout-caution',
    icon: `<svg class="callout-icon" viewBox="0 0 16 16" width="16" height="16" fill="currentColor"><path d="M4.47.046A8 8 0 0 1 15.954 11.53l-1.414-1.414A6 6 0 1 0 3.056 1.46L4.47.046Zm1.414 1.414L3.056 4.288A6 6 0 0 0 11.53 12.76l1.414-1.414A8 8 0 0 1 5.884 1.46ZM8 4.75a.75.75 0 0 1 .75.75v2.5a.75.75 0 0 1-1.5 0v-2.5A.75.75 0 0 1 8 4.75ZM9 11a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z"></path></svg>`
  }
};

module.exports = function alertsPlugin(md) {
  md.core.ruler.after('inline', 'github_alerts', (state) => {
    const tokens = state.tokens;

    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'blockquote_open') continue;

      // Buscar si el primer inline dentro del blockquote tiene [!TIPO]
      let pOpenIdx = i + 1;
      while (pOpenIdx < tokens.length && tokens[pOpenIdx].type !== 'paragraph_open' && tokens[pOpenIdx].type !== 'blockquote_close') {
        pOpenIdx++;
      }

      if (pOpenIdx >= tokens.length || tokens[pOpenIdx].type !== 'paragraph_open') continue;

      const inlineIdx = pOpenIdx + 1;
      const inlineToken = tokens[inlineIdx];
      if (!inlineToken || inlineToken.type !== 'inline') continue;

      const children = inlineToken.children || [];
      if (children.length === 0) continue;

      const firstChild = children[0];
      if (firstChild.type !== 'text') continue;

      // Coincidir con [!NOTE], [!TIP], etc.
      const match = firstChild.content.match(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*(.*))?/i);
      if (!match) continue;

      const type = match[1].toLowerCase();
      const customTitle = (match[2] || '').trim();
      const config = ALERT_CONFIG[type] || ALERT_CONFIG.note;
      const displayTitle = customTitle || config.title;

      // Convertir blockquote_open a callout_open
      tokens[i].type = 'callout_open';
      tokens[i].tag = 'div';
      tokens[i].attrs = [['class', `callout ${config.className}`]];
      tokens[i].meta = { type, displayTitle, icon: config.icon };

      // Eliminar el marcador [!TIPO] del texto
      if (customTitle) {
        // Había título en la misma línea: remover sólo el [!TIPO]
        firstChild.content = customTitle;
      } else {
        // No había título adicional: remover este token de texto y el softbreak que le sigue si existe
        children.shift();
        if (children.length > 0 && (children[0].type === 'softbreak' || children[0].type === 'hardbreak')) {
          children.shift();
        }
      }

      // Si quedaron tokens vacíos al inicio, limpiarlos
      inlineToken.content = inlineToken.content.replace(/^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\s*[\r\n]+|\s*)/i, '');

      // Buscar blockquote_close correspondiente y convertirlo a callout_close
      let depth = 1;
      for (let j = i + 1; j < tokens.length; j++) {
        if (tokens[j].type === 'blockquote_open') depth++;
        if (tokens[j].type === 'blockquote_close') {
          depth--;
          if (depth === 0) {
            tokens[j].type = 'callout_close';
            tokens[j].tag = 'div';
            break;
          }
        }
      }
    }
  });

  md.renderer.rules.callout_open = (tokens, idx) => {
    const meta = tokens[idx].meta;
    return `<div class="callout ${ALERT_CONFIG[meta.type]?.className || 'callout-note'}">
  <div class="callout-header">
    ${meta.icon}
    <span class="callout-title">${meta.displayTitle}</span>
  </div>
  <div class="callout-content">`;
  };

  md.renderer.rules.callout_close = () => {
    return '</div></div>\n';
  };
};
