const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');
const { findChromeExecutable } = require('./browser');

/**
 * Genera un archivo PDF a partir de un HTML completo usando Puppeteer
 */
async function generatePdfFromHtml(htmlContent, options = {}) {
  const browserPath = options.browserPath || findChromeExecutable();

  const launchArgs = [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    '--font-render-hinting=medium'
  ];

  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: launchArgs
  });

  try {
    const page = await browser.newPage();

    // Establecer viewport razonable
    await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

    // Cargar contenido HTML
    await page.setContent(htmlContent, {
      waitUntil: ['load', 'networkidle0'],
      timeout: 30000
    });

    // Inyectar y renderizar Mermaid si el documento contiene diagramas
    const hasMermaid = await page.evaluate(() => document.querySelectorAll('.mermaid').length > 0);
    if (hasMermaid) {
      const mermaidPath = path.resolve(__dirname, '../node_modules/mermaid/dist/mermaid.min.js');
      if (fs.existsSync(mermaidPath)) {
        await page.addScriptTag({ path: mermaidPath });
        await page.evaluate(async (isDark) => {
          if (typeof mermaid !== 'undefined') {
            mermaid.initialize({
              startOnLoad: false,
              theme: isDark ? 'dark' : 'default',
              securityLevel: 'loose',
              fontFamily: 'inherit'
            });
            await mermaid.run({
              nodes: document.querySelectorAll('.mermaid')
            });
          }
        }, options.theme === 'dark');
      }
    }

    // Esperar a que las fuentes del sistema y KaTeX se carguen
    await page.evaluateHandle('document.fonts.ready');

    // Configuración de márgenes optimizada (maximiza el ancho útil para tablas y texto)
    const margins = options.margins || {
      top: options.marginTop || '12mm',
      bottom: options.marginBottom || '12mm',
      left: options.marginLeft || '12mm',
      right: options.marginRight || '12mm'
    };

    // Configuración de encabezado y pie de página
    const displayHeaderFooter = options.headerFooter !== false && !options.noHeaderFooter;
    const docTitle = options.title || '';
    const footerLeft = options.footerLeft || docTitle;

    const headerTemplate = options.headerTemplate || `
      <div style="font-size: 8pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 12mm; color: #94a3b8; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px;">
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;">${options.headerLeft || docTitle}</span>
        <span>${options.headerRight || ''}</span>
      </div>
    `;

    const footerTemplate = options.footerTemplate || `
      <div style="font-size: 8pt; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; width: 100%; display: flex; justify-content: space-between; padding: 0 12mm; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 4px;">
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 60%;">${footerLeft}</span>
        <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
      </div>
    `;

    const pdfBuffer = await page.pdf({
      path: options.outputPath || undefined,
      format: options.format || 'A4',
      landscape: options.landscape || false,
      printBackground: true,
      displayHeaderFooter: displayHeaderFooter,
      headerTemplate: displayHeaderFooter ? headerTemplate : '<span></span>',
      footerTemplate: displayHeaderFooter ? footerTemplate : '<span></span>',
      margin: margins,
      preferCSSPageSize: true
    });

    return Buffer.from(pdfBuffer);
  } finally {
    await browser.close();
  }
}

module.exports = {
  generatePdfFromHtml
};
