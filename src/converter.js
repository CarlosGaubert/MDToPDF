const fs = require('fs');
const path = require('path');
const { parseMarkdown } = require('./markdown');
const { generatePdfFromHtml } = require('./pdf');

const THEMES = ['modern', 'academic', 'editorial', 'minimal', 'dark'];

/**
 * Carga el CSS de un tema
 */
function loadThemeCss(themeName) {
  const normalized = (themeName || 'modern').toLowerCase();
  const themeFile = THEMES.includes(normalized) ? `${normalized}.css` : 'modern.css';
  const themePath = path.join(__dirname, 'themes', themeFile);
  if (fs.existsSync(themePath)) {
    return fs.readFileSync(themePath, 'utf8');
  }
  return '';
}

/**
 * Carga y prepara KaTeX CSS para renderizado offline
 */
function loadKatexCss() {
  const katexCssPath = path.resolve(__dirname, '../node_modules/katex/dist/katex.min.css');
  if (!fs.existsSync(katexCssPath)) return '';

  let css = fs.readFileSync(katexCssPath, 'utf8');
  const fontDir = path.resolve(__dirname, '../node_modules/katex/dist/fonts').replace(/\\/g, '/');
  // Reemplazar referencias relativas a fuentes con file:/// absolutas
  css = css.replace(/url\((['"]?)fonts\//g, `url($1file:///${fontDir}/`);
  return css;
}

/**
 * Carga el CSS de resaltado de sintaxis de alta legibilidad
 */
function loadHighlightCss(themeName, customHighlightTheme) {
  if (customHighlightTheme && fs.existsSync(customHighlightTheme)) {
    return fs.readFileSync(customHighlightTheme, 'utf8');
  }

  const syntaxPath = path.join(__dirname, 'themes', 'syntax.css');
  if (fs.existsSync(syntaxPath)) {
    return fs.readFileSync(syntaxPath, 'utf8');
  }
  return '';
}

/**
 * Renderiza la plantilla de portada con los metadatos correspondientes
 */
function renderCoverHtml(metadata = {}) {
  const coverTemplatePath = path.join(__dirname, 'templates', 'cover.html');
  if (!fs.existsSync(coverTemplatePath)) return '';

  let template = fs.readFileSync(coverTemplatePath, 'utf8');

  const title = metadata.title || 'Documento sin título';
  const subtitle = metadata.subtitle || '';
  const author = metadata.author || (Array.isArray(metadata.authors) ? metadata.authors.join(', ') : '');
  const organization = metadata.organization || metadata.org || '';
  const date = metadata.date ? (metadata.date instanceof Date ? metadata.date.toLocaleDateString() : String(metadata.date)) : '';
  const version = metadata.version || '';
  const badge = metadata.badge || metadata.category || '';

  const metaDict = { title, subtitle, author, organization, date, version, badge };

  // Procesar bloques condicionales
  template = template.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
    const val = metaDict[key];
    if (val) {
      return content.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), () => val);
    }
    return '';
  });

  for (const [k, v] of Object.entries(metaDict)) {
    template = template.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), () => v);
  }

  return template;
}

/**
 * Convierte un contenido o archivo Markdown en un documento HTML completo
 */
function compileMarkdownToHtml(markdownContent, options = {}) {
  const baseDir = options.baseDir || process.cwd();

  // 1. Parsear markdown y frontmatter
  const { frontmatter, html: contentHtml } = parseMarkdown(markdownContent, {
    baseDir,
    breaks: options.breaks
  });

  // Combinar opciones de CLI con frontmatter
  const themeName = (options.theme || frontmatter.theme || 'modern').toLowerCase();
  const title = options.title || frontmatter.title || 'MDToPDF';
  const showCover = options.cover !== undefined ? options.cover : (frontmatter.cover === true);

  // 2. Cargar estilos
  const baseCssPath = path.join(__dirname, 'themes', 'base.css');
  const baseCss = fs.existsSync(baseCssPath) ? fs.readFileSync(baseCssPath, 'utf8') : '';
  const themeCss = loadThemeCss(themeName);
  const katexCss = loadKatexCss();
  const highlightCss = loadHighlightCss(themeName, options.highlightTheme);

  let customCss = '';
  if (options.customCss) {
    if (fs.existsSync(options.customCss)) {
      customCss = fs.readFileSync(options.customCss, 'utf8');
    } else {
      customCss = options.customCss;
    }
  }

  // 3. Portada
  let coverHtml = '';
  if (showCover) {
    coverHtml = renderCoverHtml({
      ...frontmatter,
      title: options.title || frontmatter.title,
      subtitle: options.subtitle || frontmatter.subtitle,
      author: options.author || frontmatter.author,
      date: options.date || frontmatter.date
    });
  }

  // 4. Cargar plantilla principal de documento
  const docTemplatePath = path.join(__dirname, 'templates', 'document.html');
  let htmlDoc = fs.readFileSync(docTemplatePath, 'utf8');

  // Si es modo vista previa web (servidor local), incluir script accesible
  let previewScripts = '';
  if (options.previewMode) {
    const hasMermaid = contentHtml.includes('class="mermaid"');
    let mermaidScriptTag = '';
    if (hasMermaid) {
      const mermaidPath = path.resolve(__dirname, '../node_modules/mermaid/dist/mermaid.min.js');
      if (fs.existsSync(mermaidPath)) {
        const b64 = fs.readFileSync(mermaidPath).toString('base64');
        mermaidScriptTag = `
          <script src="data:text/javascript;base64,${b64}"></script>
          <script>
            (async function() {
              if (typeof mermaid !== 'undefined') {
                try {
                  mermaid.initialize({
                    startOnLoad: false,
                    theme: '${themeName === 'dark' ? 'dark' : 'default'}',
                    securityLevel: 'loose'
                  });
                  await mermaid.run({ nodes: document.querySelectorAll('.mermaid') });
                } catch (err) {
                  console.error('Mermaid preview render error:', err);
                }
              }
            })();
          </script>
        `;
      }
    }

    previewScripts = `
      <style>
        /* Simulación 1:1 de Hoja de Impresión en la Vista Previa */
        html {
          background-color: #151a26;
          padding: 24px 0;
          display: flex;
          justify-content: center;
        }
        body {
          width: 186mm !important;
          max-width: 186mm !important;
          min-height: 273mm;
          margin: 0 auto !important;
          padding: 12mm !important;
          background-color: #ffffff;
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.45);
          border-radius: 4px;
          box-sizing: border-box;
        }
        body.theme-dark {
          background-color: #090d16;
          box-shadow: 0 10px 35px rgba(0, 0, 0, 0.7);
        }
      </style>
      ${mermaidScriptTag}
    `;
  }

  // Reemplazar secciones usando () => valor para evitar interpretaciones erróneas de $ en el texto
  htmlDoc = htmlDoc
    .replace('{{title}}', () => title)
    .replace('{{katexCss}}', () => katexCss)
    .replace('{{highlightCss}}', () => highlightCss)
    .replace('{{baseCss}}', () => baseCss)
    .replace(/\{\{themeName\}\}/g, () => themeName)
    .replace('{{themeCss}}', () => themeCss);

  if (customCss) {
    htmlDoc = htmlDoc
      .replace('{{#if customCss}}', '')
      .replace('{{/if}}', '')
      .replace('{{customCss}}', () => customCss);
  } else {
    htmlDoc = htmlDoc.replace(/\{\{#if customCss\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (coverHtml) {
    htmlDoc = htmlDoc
      .replace('{{#if coverHtml}}', '')
      .replace('{{/if}}', '')
      .replace('{{{coverHtml}}}', () => coverHtml);
  } else {
    htmlDoc = htmlDoc.replace(/\{\{#if coverHtml\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  if (previewScripts) {
    htmlDoc = htmlDoc
      .replace('{{#if previewScripts}}', '')
      .replace('{{/if}}', '')
      .replace('{{{previewScripts}}}', () => previewScripts);
  } else {
    htmlDoc = htmlDoc.replace(/\{\{#if previewScripts\}\}[\s\S]*?\{\{\/if\}\}/g, '');
  }

  htmlDoc = htmlDoc.replace('{{{contentHtml}}}', () => contentHtml);

  return {
    html: htmlDoc,
    frontmatter,
    themeName,
    title
  };
}

/**
 * Función principal: convierte un archivo o string Markdown a PDF
 */
async function convertMarkdownToPdf(input, options = {}) {
  let markdownText = '';
  let baseDir = options.baseDir || process.cwd();
  let defaultOutputName = null;
  const isFileInput = typeof input === 'string' && fs.existsSync(input);

  if (isFileInput) {
    markdownText = fs.readFileSync(input, 'utf8');
    baseDir = path.dirname(path.resolve(input));
    const parsedPath = path.parse(input);
    defaultOutputName = path.join(parsedPath.dir, `${parsedPath.name}.pdf`);
  } else if (typeof input === 'string') {
    markdownText = input;
  } else {
    throw new Error('El parámetro de entrada debe ser una ruta de archivo o una cadena de texto Markdown válida.');
  }

  // 1. Compilar a HTML
  const { html, frontmatter, themeName, title } = compileMarkdownToHtml(markdownText, {
    ...options,
    baseDir
  });

  if (options.htmlOnly) {
    return { html, frontmatter, themeName, title };
  }

  // 2. Determinar ruta de salida PDF
  const outputPath = options.output || options.outputPath || defaultOutputName || undefined;

  // 3. Opciones de PDF
  const pdfFormat = options.format || frontmatter.format || 'A4';
  const landscape = options.landscape !== undefined ? options.landscape : (frontmatter.orientation === 'landscape');
  const headerFooter = options.headerFooter !== undefined ? options.headerFooter : (frontmatter.headerFooter !== false);

  const pdfOptions = {
    outputPath,
    theme: themeName,
    format: pdfFormat,
    landscape,
    headerFooter,
    noHeaderFooter: options.noHeaderFooter,
    title: options.title || frontmatter.title || (outputPath ? path.parse(outputPath).name : 'documento'),
    headerLeft: options.headerLeft || frontmatter.header,
    footerLeft: options.footerLeft || frontmatter.footer,
    marginTop: options.marginTop || (frontmatter.margin && frontmatter.margin.top),
    marginBottom: options.marginBottom || (frontmatter.margin && frontmatter.margin.bottom),
    marginLeft: options.marginLeft || (frontmatter.margin && frontmatter.margin.left),
    marginRight: options.marginRight || (frontmatter.margin && frontmatter.margin.right),
    browserPath: options.browserPath
  };

  const pdfBuffer = await generatePdfFromHtml(html, pdfOptions);

  return {
    outputPath,
    pdfBuffer,
    theme: themeName,
    title
  };
}

module.exports = {
  convertMarkdownToPdf,
  compileMarkdownToHtml,
  THEMES
};
