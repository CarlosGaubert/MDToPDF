#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const pc = require('picocolors');
const { convertMarkdownToPdf, THEMES } = require('../src/converter');
const { startPreviewServer } = require('../src/server');

const packageJson = require('../package.json');

const program = new Command();

program
  .name('mdtopdf')
  .description('Herramienta de conversión de Markdown a PDF con alta fidelidad y estética editorial')
  .version(packageJson.version);

// Comando principal: conversión directa
program
  .argument('[input]', 'Archivo Markdown (.md) a convertir')
  .argument('[output]', 'Ruta de salida del PDF generado (opcional)')
  .option('-o, --output <output>', 'Ruta de salida del PDF generado')
  .option('-t, --theme <theme>', `Tema visual a aplicar (${THEMES.join(', ')})`, 'modern')
  .option('-c, --cover', 'Generar página de portada automática')
  .option('-f, --format <format>', 'Formato de papel (A4, Letter, Legal, etc.)', 'A4')
  .option('-l, --landscape', 'Orientación apaisada / horizontal')
  .option('--no-header-footer', 'Desactivar encabezados y números de página')
  .option('--header <text>', 'Texto personalizado para el encabezado')
  .option('--footer <text>', 'Texto personalizado para el pie de página')
  .option('--css <file>', 'Ruta a un archivo CSS con estilos adicionales')
  .option('-w, --watch', 'Modo vigilancia: regenera el PDF ante cualquier cambio')
  .option('-b, --browser <path>', 'Ruta específica al ejecutable de Chrome o Edge')
  .action(async (input, output, options) => {
    if (!input) {
      program.help();
      return;
    }

    const inputPath = path.resolve(process.cwd(), input);
    if (!fs.existsSync(inputPath)) {
      console.error(pc.red(`\n✖ Error: El archivo "${input}" no existe.`));
      process.exit(1);
    }

    const targetOutput = options.output || output;
    const outputPath = targetOutput
      ? path.resolve(process.cwd(), targetOutput)
      : path.join(path.dirname(inputPath), `${path.parse(inputPath).name}.pdf`);

    const doConvert = async () => {
      const startTime = Date.now();
      process.stdout.write(pc.cyan(`\n⚡ Procesando "${path.basename(inputPath)}" con tema "${options.theme}"...`));

      try {
        const result = await convertMarkdownToPdf(inputPath, {
          outputPath,
          theme: options.theme,
          cover: options.cover,
          format: options.format,
          landscape: options.landscape,
          noHeaderFooter: !options.headerFooter,
          headerLeft: options.header,
          footerLeft: options.footer,
          customCss: options.css,
          browserPath: options.browser
        });

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(pc.green(`\n✔ PDF generado exitosamente:`));
        console.log(pc.bold(`   📄 ${result.outputPath}`));
        console.log(pc.dim(`   ⏱  Completado en ${elapsed}s\n`));
      } catch (err) {
        console.error(pc.red(`\n✖ Error durante la conversión:`), err.message);
      }
    };

    await doConvert();

    if (options.watch) {
      console.log(pc.blue(`👀 Observando cambios en "${path.basename(inputPath)}"... (Presiona Ctrl+C para salir)`));
      let debounceTimeout = null;

      fs.watch(inputPath, (eventType) => {
        if (eventType === 'change') {
          clearTimeout(debounceTimeout);
          debounceTimeout = setTimeout(() => {
            console.log(pc.yellow(`\n↻ Archivo modificado. Regenerando PDF...`));
            doConvert();
          }, 300);
        }
      });
    }
  });

// Subcomando: Servidor de Vista Previa / GUI interactiva
program
  .command('serve [file]')
  .description('Inicia una interfaz web interactiva con editor, vista previa en tiempo real y descarga de PDF')
  .option('-p, --port <port>', 'Puerto del servidor web', 3000)
  .action((file, cmdOptions) => {
    const filePath = file ? path.resolve(process.cwd(), file) : null;
    startPreviewServer({
      port: parseInt(cmdOptions.port, 10),
      initialFile: filePath
    });
  });

program.parse(process.argv);
