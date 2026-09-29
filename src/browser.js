const fs = require('fs');
const path = require('path');
const os = require('os');

/**
 * Busca y retorna la ruta a un ejecutable de navegador basado en Chromium
 * (Microsoft Edge, Google Chrome, Brave, Chromium) disponible en el sistema.
 */
function findChromeExecutable() {
  // 1. Verificar variables de entorno
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  const platform = os.platform();
  const candidates = [];

  if (platform === 'win32') {
    const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';
    const localAppData = process.env['LOCALAPPDATA'] || path.join(os.homedir(), 'AppData', 'Local');

    candidates.push(
      // Microsoft Edge (estándar en Windows 10/11)
      path.join(programFilesX86, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(programFiles, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      path.join(localAppData, 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
      // Google Chrome
      path.join(programFiles, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(programFilesX86, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      path.join(localAppData, 'Google', 'Chrome', 'Application', 'chrome.exe'),
      // Brave
      path.join(programFiles, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe'),
      path.join(localAppData, 'BraveSoftware', 'Brave-Browser', 'Application', 'brave.exe')
    );
  } else if (platform === 'darwin') {
    candidates.push(
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
      '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
      '/Applications/Chromium.app/Contents/MacOS/Chromium'
    );
  } else {
    // Linux y Unix
    candidates.push(
      '/usr/bin/google-chrome-stable',
      '/usr/bin/google-chrome',
      '/usr/bin/microsoft-edge-stable',
      '/usr/bin/microsoft-edge',
      '/usr/bin/chromium-browser',
      '/usr/bin/chromium',
      '/snap/bin/chromium'
    );
  }

  for (const candidate of candidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'No se encontró un navegador basado en Chromium (Microsoft Edge, Google Chrome, etc.).\n' +
    'Por favor, instala Chrome o Edge, o define la variable de entorno PUPPETEER_EXECUTABLE_PATH.'
  );
}

module.exports = {
  findChromeExecutable
};
