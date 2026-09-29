// MDToPDF - Aplicación Frontend Interactiva

const markdownInput = document.getElementById('markdownInput');
const previewIframe = document.getElementById('previewIframe');
const themeSelect = document.getElementById('themeSelect');
const formatSelect = document.getElementById('formatSelect');
const coverCheckbox = document.getElementById('coverCheckbox');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const exportPdfBtn = document.getElementById('exportPdfBtn');
const exportBtnText = document.getElementById('exportBtnText');
const fileInput = document.getElementById('fileInput');
const charCount = document.getElementById('charCount');
const wordCount = document.getElementById('wordCount');
const statusIndicator = document.getElementById('statusIndicator');
const activeThemeBadge = document.getElementById('activeThemeBadge');

let updateTimeout = null;

const SAMPLE_MARKDOWN = `---
title: "MDToPDF: Sistema de Publicación Profesional"
subtitle: "Transformación de Markdown a Documentos de Calidad Editorial"
author: "Equipo de Arquitectura MDToPDF"
organization: "Ingeniería de Software"
date: "2026-09-25"
version: "1.0.0"
badge: "ESPECIFICACIÓN TÉCNICA"
theme: "modern"
cover: true
toc: true
---

# 1. Introducción y Alcance

MDToPDF es un motor de renderizado de alta fidelidad diseñado para convertir documentos Markdown estándar y extendidos (GFM) en archivos PDF con estética de imprenta profesional.

> [!NOTE]
> Todos los elementos se renderizan 100% de manera autónoma, soportando fórmulas matemáticas, diagramas vectoriales y estilos tipográficos avanzados sin requerir conexión a internet.

## 1.1 Características Principales

- **Fidelidad sintáctica**: Soporte completo para tablas, listas de verificación, notas al pie y fórmulas matemáticas.
- **Diagramas nativos**: Renderizado vectorial de diagramas Mermaid en tiempo de compilación.
- **Tipografía y Maquetación**: Control anti-huérfanas (*break-inside: avoid*), encabezados y numeración dinámica.

---

# 2. Demostración de Matemáticas con KaTeX

MDToPDF procesa expresiones matemáticas en línea como $E = mc^2$ y la ecuación de Euler $e^{i\\pi} + 1 = 0$, así como bloques complejos:

$$f(x) = \\int_{-\\infty}^{\\infty} \\hat{f}(\\xi)\\,e^{2 \\pi i \\xi x} \\,d\\xi$$

Matriz de covarianza de ejemplo:

$$\\mathbf{\\Sigma} = \\begin{pmatrix} \\sigma_1^2 & \\rho \\sigma_1 \\sigma_2 \\\\ \\rho \\sigma_1 \\sigma_2 & \\sigma_2^2 \\end{pmatrix}$$

---

# 3. Diagramas de Flujo y Secuencia (Mermaid)

Los diagramas se integran directamente utilizando bloques \`mermaid\`:

\`\`\`mermaid
graph TD
    A[Archivo Markdown .md] --> B[Pipeline de Parseo MDToPDF]
    B --> C{Detectar Componentes}
    C -->|Fórmulas| D[KaTeX Engine]
    C -->|Diagramas| E[Mermaid SVG]
    C -->|Metadatos| F[Frontmatter & Cover]
    D --> G[Documento HTML Editorial]
    E --> G
    F --> G
    G --> H[Motor Chromium Headless]
    H --> I[PDF Final de Alta Calidad]
\`\`\`

---

# 4. Alertas y Callouts Estilo GitHub

> [!TIP]
> Puedes utilizar los temas \`modern\`, \`academic\`, \`editorial\`, \`minimal\` y \`dark\` según la ocasión y público objetivo.

> [!IMPORTANT]
> Los saltos de página se pueden forzar en cualquier momento escribiendo \`<!-- pagebreak -->\`.

> [!WARNING]
> Asegúrate de cerrar adecuadamente los bloques de código y delimitadores matemáticos para una renderización perfecta.

> [!CAUTION]
> No elimines las dependencias del motor Chromium local para mantener la capacidad de compilación offline.

---

# 5. Tablas y Listas de Tareas

A continuación se presenta una matriz de compatibilidad de formatos:

| Componente | Estado | Motor | Soporte Offline |
| :--- | :---: | :--- | :---: |
| **CommonMark** | ✔ Activo | markdown-it | Sí |
| **KaTeX Math** | ✔ Activo | KaTeX 0.16 | Sí |
| **Mermaid Charts** | ✔ Activo | Mermaid 11 | Sí |
| **GitHub Alerts** | ✔ Activo | MDToPDF Plugin | Sí |
| **Portadas Elegantes** | ✔ Activo | Template Engine | Sí |

### Lista de Verificación de Producción

- [x] Configuración de temas tipográficos
- [x] Mapeo automático de saltos de página
- [x] Soporte para imágenes locales relativas y absolutas
- [ ] Implementación de firma digital de documentos

<!-- pagebreak -->

# 6. Bloques de Código Multilingüe

A continuación un ejemplo de función en JavaScript moderno:

\`\`\`javascript
/**
 * Convierte un documento markdown a PDF de alta resolución
 */
async function compileDocument(filePath, options = {}) {
  const markdown = await fs.promises.readFile(filePath, 'utf-8');
  const pdf = await mdtopdf.convert(markdown, {
    theme: options.theme || 'modern',
    cover: true,
    format: 'A4'
  });
  return pdf;
}
\`\`\`

Y un ejemplo de script en Python:

\`\`\`python
import os
from pathlib import Path

def inspect_document(filename: str) -> dict:
    path = Path(filename)
    return {
        "exists": path.exists(),
        "size_kb": path.stat().st_size / 1024,
        "extension": path.suffix
    }
\`\`\`

---

# 7. Conclusión

El sistema **MDToPDF** combina el estándar más estricto de fidelidad tipográfica con la flexibilidad de un motor moderno, convirtiéndolo en la herramienta definitiva para crear reportes, libros técnicos y documentación ejecutiva.
`;

// Actualizar contadores
function updateCounters(text) {
  charCount.textContent = `${text.length.toLocaleString()} caracteres`;
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  wordCount.textContent = `${words.toLocaleString()} palabras`;
}

// Actualizar Vista Previa
async function updatePreview() {
  statusIndicator.textContent = 'Renderizando...';
  statusIndicator.className = 'status-updating';

  const markdown = markdownInput.value;
  const theme = themeSelect.value;
  const cover = coverCheckbox.checked;

  activeThemeBadge.textContent = `Tema: ${theme.charAt(0).toUpperCase() + theme.slice(1)}`;

  try {
    const response = await fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ markdown, theme, cover })
    });

    if (response.ok) {
      const html = await response.text();
      previewIframe.srcdoc = html;
      statusIndicator.textContent = 'Actualizado';
      statusIndicator.className = 'status-ready';
    } else {
      statusIndicator.textContent = 'Error al renderizar';
    }
  } catch (err) {
    console.error(err);
    statusIndicator.textContent = 'Error de conexión';
  }
}

// Programar actualización con debounce
function scheduleUpdate() {
  clearTimeout(updateTimeout);
  updateCounters(markdownInput.value);
  updateTimeout = setTimeout(updatePreview, 350);
}

// Exportar a PDF
async function exportToPdf() {
  exportPdfBtn.disabled = true;
  exportBtnText.textContent = 'Compilando PDF...';

  try {
    const response = await fetch('/api/export-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        markdown: markdownInput.value,
        theme: themeSelect.value,
        format: formatSelect.value,
        cover: coverCheckbox.checked
      })
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({ error: 'Error del servidor' }));
      throw new Error(err.error || 'Error al compilar el PDF');
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Si por alguna razón el servidor envió JSON serializado {"0":37,...}, reconstruir los bytes binarios reales
    let pdfData = arrayBuffer;
    if (bytes.length > 0 && bytes[0] === 123 /* '{' */) {
      try {
        const text = new TextDecoder().decode(bytes);
        const json = JSON.parse(text);
        if (typeof json['0'] === 'number') {
          const keys = Object.keys(json);
          const recovered = new Uint8Array(keys.length);
          for (let i = 0; i < keys.length; i++) {
            recovered[i] = json[i];
          }
          pdfData = recovered.buffer;
        } else if (json.error) {
          throw new Error(json.error);
        }
      } catch (decodeErr) {
        console.warn('No se pudo reconstruir JSON como binario:', decodeErr);
      }
    }

    const blob = new Blob([pdfData], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `documento-${themeSelect.value}.pdf`;
    document.body.appendChild(a);
    a.click();

    // Retrasar revocación para permitir que el navegador procese la descarga
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      a.remove();
    }, 15000);
  } catch (err) {
    alert('Error al generar PDF: ' + err.message);
  } finally {
    exportPdfBtn.disabled = false;
    exportBtnText.textContent = 'Descargar PDF';
  }
}

// Event Listeners
markdownInput.addEventListener('input', scheduleUpdate);
themeSelect.addEventListener('change', updatePreview);
formatSelect.addEventListener('change', updatePreview);
coverCheckbox.addEventListener('change', updatePreview);

loadSampleBtn.addEventListener('click', () => {
  markdownInput.value = SAMPLE_MARKDOWN;
  coverCheckbox.checked = true;
  scheduleUpdate();
});

exportPdfBtn.addEventListener('click', exportToPdf);

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    markdownInput.value = event.target.result;
    scheduleUpdate();
  };
  reader.readAsText(file);
});

// Inicialización
async function init() {
  try {
    const res = await fetch('/api/initial-file');
    const data = await res.json();
    if (data && data.content) {
      markdownInput.value = data.content;
    } else {
      markdownInput.value = SAMPLE_MARKDOWN;
      coverCheckbox.checked = true;
    }
  } catch (_) {
    markdownInput.value = SAMPLE_MARKDOWN;
    coverCheckbox.checked = true;
  }
  scheduleUpdate();
}

init();
