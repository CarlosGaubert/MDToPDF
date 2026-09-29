const fs = require('fs');
const path = require('path');
const MarkdownIt = require('markdown-it');
const markdownItAnchor = require('markdown-it-anchor');
const markdownItFootnote = require('markdown-it-footnote');
const markdownItTaskLists = require('markdown-it-task-lists');
const markdownItToc = require('markdown-it-toc-done-right');
const hljs = require('highlight.js');
const grayMatter = require('gray-matter');

const katexPlugin = require('./plugins/katex');
const alertsPlugin = require('./plugins/alerts');

/**
 * Crea una instancia configurada de Markdown-it
 */
function createMarkdownParser(options = {}) {
  const md = new MarkdownIt({
    html: true,
    xhtmlOut: true,
    breaks: options.breaks !== undefined ? options.breaks : true,
    linkify: true,
    typographer: true,
    highlight: function (str, lang) {
      if (lang && lang.toLowerCase() === 'mermaid') {
        // Dejar para el renderizador de diagramas Mermaid
        return `<div class="mermaid">${str}</div>`;
      }

      let codeHtml = '';
      let displayLang = (lang || 'TEXT').toUpperCase();

      if (lang && hljs.getLanguage(lang)) {
        try {
          codeHtml = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
        } catch (_) {
          codeHtml = md.utils.escapeHtml(str);
        }
      } else {
        try {
          // Autodetección si no hay lenguaje especificado
          if (lang) {
            codeHtml = md.utils.escapeHtml(str);
          } else {
            const detected = hljs.highlightAuto(str);
            codeHtml = detected.value;
            if (detected.language) displayLang = detected.language.toUpperCase();
          }
        } catch (_) {
          codeHtml = md.utils.escapeHtml(str);
        }
      }

      return `<div class="code-block-wrapper">` +
        `<div class="code-header">` +
        `<div class="code-dots"><span class="code-dot dot-red"></span><span class="code-dot dot-yellow"></span><span class="code-dot dot-green"></span></div>` +
        `<span class="code-lang">${displayLang}</span>` +
        `</div>` +
        `<pre class="hljs"><code class="hljs ${lang ? 'language-' + lang : ''}">${codeHtml}</code></pre>` +
        `</div>`;
    }
  });

  // Plugins
  md.use(markdownItAnchor, {
    permalink: false,
    slugify: (s) =>
      encodeURIComponent(
        String(s)
          .trim()
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/[\s_-]+/g, '-')
          .replace(/^-+|-+$/g, '')
      )
  });

  md.use(markdownItFootnote);

  md.use(markdownItTaskLists, {
    enabled: true,
    label: true,
    labelAfter: true
  });

  md.use(markdownItToc, {
    containerClass: 'table-of-contents',
    listType: 'ul',
    level: [1, 2, 3, 4]
  });

  md.use(katexPlugin);
  md.use(alertsPlugin);

  // Envolver tablas en un contenedor estético
  const defaultTableOpen = md.renderer.rules.table_open || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };
  const defaultTableClose = md.renderer.rules.table_close || function (tokens, idx, options, env, self) {
    return self.renderToken(tokens, idx, options);
  };

  md.renderer.rules.table_open = function (tokens, idx, options, env, self) {
    return '<div class="table-container">' + defaultTableOpen(tokens, idx, options, env, self);
  };

  md.renderer.rules.table_close = function (tokens, idx, options, env, self) {
    return defaultTableClose(tokens, idx, options, env, self) + '</div>';
  };

  return md;
}

/**
 * Resuelve rutas relativas de imágenes locales y las convierte en file:// o data URI base64
 */
function resolveImageSources(html, baseDir) {
  if (!baseDir) return html;

  return html.replace(/<img\s+([^>]*?)src=["']([^"']+)["']([^>]*?)>/gi, (match, before, src, after) => {
    // Si ya es http, https, data URI o file://, no modificar
    if (/^(https?:|data:|file:)/i.test(src)) {
      return match;
    }

    const resolvedPath = path.isAbsolute(src) ? src : path.resolve(baseDir, src);
    if (fs.existsSync(resolvedPath)) {
      try {
        const ext = path.extname(resolvedPath).toLowerCase().replace('.', '');
        const mimeType = ext === 'svg' ? 'image/svg+xml' :
                         ext === 'png' ? 'image/png' :
                         (ext === 'jpg' || ext === 'jpeg') ? 'image/jpeg' :
                         ext === 'webp' ? 'image/webp' :
                         ext === 'gif' ? 'image/gif' : 'application/octet-stream';
        const fileData = fs.readFileSync(resolvedPath);
        const dataUri = `data:${mimeType};base64,${fileData.toString('base64')}`;
        return `<img ${before}src="${dataUri}"${after}>`;
      } catch (err) {
        // Fallback a file URL
        const fileUrl = 'file:///' + resolvedPath.replace(/\\/g, '/');
        return `<img ${before}src="${fileUrl}"${after}>`;
      }
    }

    return match;
  });
}

/**
 * Procesa saltos de página especiales
 */
function processPageBreaks(markdownText) {
  // Reemplazar <!-- pagebreak -->, <!-- page-break -->, \pagebreak
  return markdownText
    .replace(/<!--\s*page[-_]?break\s*-->/gi, '\n\n<div class="page-break"></div>\n\n')
    .replace(/^\\pagebreak\s*$/gim, '\n\n<div class="page-break"></div>\n\n')
    .replace(/^\[\[\s*pagebreak\s*\]\]$/gim, '\n\n<div class="page-break"></div>\n\n');
}

/**
 * Parsea un archivo o texto Markdown con YAML frontmatter y genera HTML listo
 */
function parseMarkdown(rawContent, options = {}) {
  // 1. Extraer frontmatter con gray-matter
  const { data: frontmatter, content: markdownBody } = grayMatter(rawContent);

  // 2. Procesar saltos de página y variables especiales
  let preparedMarkdown = processPageBreaks(markdownBody);

  // Si frontmatter tiene toc: true y no está en el cuerpo, agregarlo al inicio
  if (frontmatter.toc && !preparedMarkdown.includes('${toc}') && !preparedMarkdown.includes('[[toc]]')) {
    preparedMarkdown = '[[toc]]\n\n' + preparedMarkdown;
  }

  // 3. Crear parser y compilar HTML
  const parser = createMarkdownParser(options);
  let html = parser.render(preparedMarkdown);

  // 4. Resolver imágenes si se especifica baseDir
  if (options.baseDir) {
    html = resolveImageSources(html, options.baseDir);
  }

  return {
    frontmatter,
    html
  };
}

module.exports = {
  createMarkdownParser,
  parseMarkdown,
  resolveImageSources
};
