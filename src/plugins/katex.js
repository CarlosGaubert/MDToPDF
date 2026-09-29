const katex = require('katex');

function isValidDelim(state, pos) {
  const max = state.posMax;
  const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
  const nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

  let can_open = true;
  let can_close = true;

  // No abrir si el siguiente caracter es espacio o newline
  if (nextChar === 0x20 /*   */ || nextChar === 0x09 /* \t */ || nextChar === 0x0a /* \n */) {
    can_open = false;
  }
  // No cerrar si el anterior caracter es espacio o newline
  if (prevChar === 0x20 /*   */ || prevChar === 0x09 /* \t */ || prevChar === 0x0a /* \n */) {
    can_close = false;
  }

  return { can_open, can_close };
}

function mathInline(state, silent) {
  if (state.src.charCodeAt(state.pos) !== 0x24 /* $ */) {
    return false;
  }

  // Prevenir $$ aquí (eso es math_block)
  if (state.src.charCodeAt(state.pos + 1) === 0x24) {
    return false;
  }

  const res = isValidDelim(state, state.pos);
  if (!res.can_open) {
    if (!silent) { state.pending += '$'; }
    state.pos += 1;
    return true;
  }

  const start = state.pos + 1;
  let match = start;
  let pos = -1;

  while ((pos = state.src.indexOf('$', match)) !== -1) {
    // Si está escapado con backslash, continuar
    let backslashes = 0;
    let b = pos - 1;
    while (b >= 0 && state.src.charCodeAt(b) === 0x5c /* \ */) {
      backslashes++;
      b--;
    }
    if (backslashes % 2 === 1) {
      match = pos + 1;
      continue;
    }

    // No debe ser $$
    if (state.src.charCodeAt(pos + 1) === 0x24) {
      match = pos + 2;
      continue;
    }

    const closeRes = isValidDelim(state, pos);
    if (!closeRes.can_close) {
      match = pos + 1;
      continue;
    }

    if (!silent) {
      const content = state.src.slice(start, pos);
      const token = state.push('math_inline', 'math', 0);
      token.markup = '$';
      token.content = content;
    }

    state.pos = pos + 1;
    return true;
  }

  if (!silent) { state.pending += '$'; }
  state.pos += 1;
  return true;
}

function mathBlock(state, startLine, endLine, silent) {
  let pos = state.bMarks[startLine] + state.tShift[startLine];
  let max = state.eMarks[startLine];

  if (pos + 2 > max) { return false; }
  if (state.src.charCodeAt(pos) !== 0x24 || state.src.charCodeAt(pos + 1) !== 0x24) {
    return false;
  }

  pos += 2;
  let firstLine = state.src.slice(pos, max);

  if (silent) { return true; }

  let haveEndMarker = false;

  // Caso: $$ en la misma línea $$
  if (firstLine.trim().endsWith('$$') && firstLine.trim().length > 2) {
    firstLine = firstLine.trim().slice(0, -2);
    haveEndMarker = true;
  }

  let nextLine = startLine;
  const lines = [];

  if (haveEndMarker) {
    lines.push(firstLine);
  } else {
    if (firstLine.trim().length > 0) {
      lines.push(firstLine);
    }
    for (;;) {
      nextLine++;
      if (nextLine >= endLine) { break; }

      pos = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];

      if (pos < max && state.tShift[nextLine] < state.blkIndent) {
        break;
      }

      const line = state.src.slice(pos, max);
      if (line.trim().startsWith('$$')) {
        haveEndMarker = true;
        break;
      }
      lines.push(line);
    }
  }

  state.line = nextLine + 1;

  const token = state.push('math_block', 'math', 0);
  token.block = true;
  token.content = lines.join('\n');
  token.markup = '$$';
  token.map = [startLine, state.line];

  return true;
}

module.exports = function katexPlugin(md, options = {}) {
  const katexOptions = {
    throwOnError: false,
    output: 'htmlAndMathml',
    ...options
  };

  md.inline.ruler.before('escape', 'math_inline', mathInline);
  md.block.ruler.before('fence', 'math_block', mathBlock, {
    alt: ['paragraph', 'reference', 'blockquote', 'list']
  });

  md.renderer.rules.math_inline = (tokens, idx) => {
    try {
      return katex.renderToString(tokens[idx].content, {
        ...katexOptions,
        displayMode: false
      });
    } catch (err) {
      return `<span class="katex-error" title="${err.toString()}">${tokens[idx].content}</span>`;
    }
  };

  md.renderer.rules.math_block = (tokens, idx) => {
    try {
      return `<div class="math-block">${katex.renderToString(tokens[idx].content, {
        ...katexOptions,
        displayMode: true
      })}</div>`;
    } catch (err) {
      return `<div class="katex-error" title="${err.toString()}"><pre>${tokens[idx].content}</pre></div>`;
    }
  };
};
