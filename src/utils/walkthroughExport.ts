import { WALKTHROUGH_CONTENT_ES } from './walkthroughData';

/**
 * Utility to trigger browser downloads of the official walkthrough
 */
export function downloadWalkthroughTxt(filename = 'Guia_Oficial_Head_Over_Heels_2.txt') {
  const blob = new Blob([WALKTHROUGH_CONTENT_ES], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadWalkthroughMarkdown(filename = 'Guia_Oficial_Head_Over_Heels_2.md') {
  const blob = new Blob([WALKTHROUGH_CONTENT_ES], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function printOrSaveAsPdf() {
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    // Fallback to txt download if popup blocked
    downloadWalkthroughTxt();
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Guía Oficial - Head Over Heels 2.0 (PDF Ready)</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 1.5cm;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            background: #ffffff;
            color: #0f172a;
            line-height: 1.4;
            font-size: 11px;
            white-space: pre-wrap;
            margin: 0;
            padding: 20px;
          }
          h1, h2, h3 {
            color: #0284c7;
            font-weight: bold;
          }
          .header-banner {
            border: 2px solid #0284c7;
            padding: 12px;
            text-align: center;
            margin-bottom: 20px;
            background: #f0f9ff;
          }
          @media print {
            body {
              font-size: 10px;
              padding: 0;
            }
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print" style="margin-bottom: 20px; text-align: right;">
          <button onclick="window.print()" style="padding: 10px 20px; font-size: 14px; background: #0284c7; color: white; border: none; border-radius: 6px; cursor: pointer;">
            🖨️ Imprimir / Guardar como PDF
          </button>
        </div>
        <div class="header-banner">
          <strong>HEAD OVER HEELS 2.0 – SCI-FI REBORN // GUÍA OFICIAL DE RESOLUCIÓN TÁCTICA</strong><br/>
          Documento A4 listo para impresión y guardado como PDF en navegadores
        </div>
        <div>${escapeHtml(WALKTHROUGH_CONTENT_ES)}</div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
}

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
