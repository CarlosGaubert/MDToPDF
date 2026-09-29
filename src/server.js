const express = require('express');
const path = require('path');
const fs = require('fs');
const http = require('http');
const pc = require('picocolors');
const { compileMarkdownToHtml, convertMarkdownToPdf, THEMES } = require('./converter');

function startPreviewServer(options = {}) {
  const app = express();
  const port = options.port || 3000;
  const initialFilePath = options.initialFile;

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
  app.use(express.static(path.join(__dirname, '../public')));
  app.use('/vendor/mermaid', express.static(path.join(__dirname, '../node_modules/mermaid/dist')));

  // Endpoint para obtener información del archivo inicial (si se pasó por CLI)
  app.get('/api/initial-file', (req, res) => {
    if (initialFilePath && fs.existsSync(initialFilePath)) {
      try {
        const content = fs.readFileSync(initialFilePath, 'utf8');
        return res.json({
          filename: path.basename(initialFilePath),
          path: initialFilePath,
          content
        });
      } catch (err) {
        return res.status(500).json({ error: err.message });
      }
    }
    return res.json({ filename: null, content: null });
  });

  // Endpoint para obtener vista previa HTML en tiempo real
  app.post('/api/preview', (req, res) => {
    try {
      const { markdown, theme, cover, customCss } = req.body;
      const baseDir = initialFilePath ? path.dirname(initialFilePath) : process.cwd();

      const result = compileMarkdownToHtml(markdown || '', {
        theme: theme || 'modern',
        cover: cover === true,
        customCss,
        baseDir,
        previewMode: true
      });

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(result.html);
    } catch (err) {
      res.status(500).send(`<div style="color: red; padding: 20px;">Error al generar vista previa: ${err.message}</div>`);
    }
  });

  // Endpoint para descargar PDF generado directamente desde la GUI
  app.post('/api/export-pdf', async (req, res) => {
    try {
      const { markdown, theme, cover, format, landscape, customCss } = req.body;
      const baseDir = initialFilePath ? path.dirname(initialFilePath) : process.cwd();

      const result = await convertMarkdownToPdf(markdown || '', {
        theme: theme || 'modern',
        cover: cover === true,
        format: format || 'A4',
        landscape: landscape === true,
        customCss,
        baseDir
      });

      const buffer = Buffer.isBuffer(result.pdfBuffer) ? result.pdfBuffer : Buffer.from(result.pdfBuffer);

      res.writeHead(200, {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="documento.pdf"',
        'Content-Length': buffer.length
      });
      res.end(buffer);
    } catch (err) {
      console.error('Error generando PDF desde servidor:', err);
      res.status(500).json({ error: err.message });
    }
  });

  const server = http.createServer(app);

  server.listen(port, () => {
    const url = `http://localhost:${port}`;
    console.log(pc.green(`\n✔ Servidor de vista previa interactiva iniciado:`));
    console.log(pc.bold(`   🌐 ${url}`));
    if (initialFilePath) {
      console.log(pc.cyan(`   📄 Archivo cargado: ${initialFilePath}`));
    }
    console.log(pc.dim(`\nAbre tu navegador en ${url} para editar y exportar con estética en tiempo real.\n`));
  });

  return server;
}

module.exports = {
  startPreviewServer
};
