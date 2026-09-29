---
title: "Análisis Comparativo de Rendimiento en Motores de Conversión Documental"
subtitle: "Evaluación de fidelidad tipográfica, eficiencia de renderizado y portabilidad offline"
author: "Dr. Carlos Mendoza, Dra. Elena Valenzuela"
organization: "Instituto de Ciencias de la Computación y Tipografía Digital"
date: "Septiembre 2026"
version: "Rev. 3.2"
theme: "academic"
cover: true
toc: true
format: "A4"
---

# Resumen

En el presente artículo evaluamos las capacidades arquitectónicas y la fidelidad estética de los motores contemporáneos de transformación de Markdown a formatos de formato fijo (PDF). Demostramos que la combinación de parseadores CommonMark desacoplados con navegadores headless permite obtener una fidelidad superior a los métodos basados en LaTeX tradicional, minimizando la complejidad de configuración y garantizando consistencia tipográfica.

---

# 1. Introducción

La redacción técnica moderna ha migrado masivamente hacia formatos basados en texto plano como Markdown debido a su compatibilidad con sistemas de control de versiones y simplicidad sintáctica. No obstante, la producción de documentos finales suele requerir estándares de publicación formales que demandan:

1. **Alineación justificada estricta** y partición silábica controlada.
2. **Representación matemática de alta fidelidad** basada en el motor KaTeX.
3. **Tablas académicas normalizadas** (estilo APA/IEEE) sin barras divisorias verticales.

---

# 2. Marco Teórico y Ecuaciones

Consideremos una función de pérdida estocástica evaluada sobre un conjunto de parámetros $\theta \in \mathbb{R}^d$:

$$\mathcal{L}(\theta) = \frac{1}{N} \sum_{i=1}^N \ell(f(x_i; \theta), y_i) + \frac{\lambda}{2} \|\theta\|_2^2$$

El gradiente con respecto a los parámetros se computa analíticamente:

$$\nabla_\theta \mathcal{L}(\theta) = \frac{1}{N} \sum_{i=1}^N \nabla_\theta \ell(f(x_i; \theta), y_i) + \lambda \theta$$

---

# 3. Resultados Experimentales

La Tabla 1 sintetiza los tiempos medios de compilación y la fidelidad vectorial observada en un banco de pruebas de 50 documentos técnicos.

| Motor Evaluado | Tiempo Medio (ms) | Consumo de RAM (MB) | Fidelidad SVG (%) |
| :--- | :---: | :---: | :---: |
| **Pandoc + LaTeX** | 3.420 | 480 | 91.5% |
| **WeasyPrint** | 1.850 | 210 | 88.0% |
| **MDToPDF (Edge/Chrome)** | 980 | 145 | 99.8% |

> [!NOTE]
> Los experimentos se ejecutaron sobre una máquina de pruebas con procesador de 8 núcleos y 16 GB de memoria RAM.

---

# 4. Conclusiones

La solución implementada en MDToPDF demuestra una reducción significativa en los tiempos de generación a la vez que preserva intacta la identidad visual del documento original.
