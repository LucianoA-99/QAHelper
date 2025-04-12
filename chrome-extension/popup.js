const { jsPDF } = window.jspdf;

// Constantes para el formato del PDF
const PDF_CONFIG = {
  orientation: "portrait",
  unit: "mm",
  format: "a4",
  margin: 10,
  maxY: 250,
  lineHeight: 5,
  imageWidth: 80,
  imageHeight: 45
};

// Elementos de la UI
const exportButton = document.getElementById('export');
const downloadDOMButton = document.getElementById('downloadDOM');
const loadingSpinner = exportButton.querySelector('.loading');
const domLoadingSpinner = downloadDOMButton.querySelector('.loading');
const statusText = document.getElementById('status');
const errorText = document.getElementById('error');

// Función para validar los datos de la sesión
function validateSessionData(data) {
  if (!data || !data.session_info || !data.acciones_con_capturas) {
    throw new Error("Datos de sesión inválidos");
  }
  return data;
}

// Función para agregar texto con formato
function addText(doc, text, y, fontSize = 10) {
  doc.setFontSize(fontSize);
  doc.text(text, PDF_CONFIG.margin, y);
  return y + PDF_CONFIG.lineHeight;
}

// Función para actualizar el estado de la UI
function updateUIState(isLoading, status = '', error = '') {
  exportButton.disabled = isLoading;
  loadingSpinner.style.display = isLoading ? 'block' : 'none';
  statusText.textContent = status;
  errorText.textContent = error;
  errorText.style.display = error ? 'block' : 'none';
}

// Función para actualizar el estado del botón de DOM
function updateDOMButtonState(isLoading, status = '') {
  downloadDOMButton.disabled = isLoading;
  domLoadingSpinner.style.display = isLoading ? 'block' : 'none';
  if (status) {
    statusText.textContent = status;
  }
}

// Función para descargar el DOM
async function downloadDOM() {
  try {
    updateDOMButtonState(true, 'Obteniendo DOM...');
    
    // Obtener el DOM actual
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const result = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: () => {
        return {
          html: document.documentElement.outerHTML,
          title: document.title,
          url: window.location.href,
          timestamp: new Date().toISOString()
        };
      }
    });

    const { html, title, url: pageUrl, timestamp } = result[0].result;

    // Crear el nombre del archivo
    const filename = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${timestamp.replace(/[:.]/g, '-')}.html`;

    // Crear el contenido del archivo con metadatos
    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} - DOM Snapshot</title>
  <meta name="generated" content="${timestamp}">
  <meta name="url" content="${pageUrl}">
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    .metadata { 
      background: #f5f5f5; 
      padding: 15px; 
      margin-bottom: 20px; 
      border-radius: 5px;
    }
    .metadata h2 { margin-top: 0; }
    .metadata p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="metadata">
    <h2>Metadatos del DOM</h2>
    <p><strong>URL:</strong> ${pageUrl}</p>
    <p><strong>Título:</strong> ${title}</p>
    <p><strong>Generado:</strong> ${new Date(timestamp).toLocaleString()}</p>
  </div>
  ${html}
</body>
</html>`;

    // Crear y descargar el archivo
    const blob = new Blob([content], { type: 'text/html' });
    const downloadUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(downloadUrl);

    updateDOMButtonState(false, 'DOM descargado exitosamente');
    
    // Limpiar el mensaje después de 3 segundos
    setTimeout(() => {
      updateDOMButtonState(false);
    }, 3000);

  } catch (error) {
    console.error("Error al descargar el DOM:", error);
    updateDOMButtonState(false, '', `Error: ${error.message}`);
  }
}

// Event Listeners
exportButton.addEventListener('click', async () => {
  try {
    updateUIState(true, 'Generando reporte...');
    
    const response = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ type: 'getSessionData' }, (response) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(response);
        }
      });
    });

    const { session_info, acciones_con_capturas } = validateSessionData(response);
    const doc = new jsPDF(PDF_CONFIG);

    // Encabezado
    let y = PDF_CONFIG.margin;
    y = addText(doc, 'QA Session Report', y, 14);
    y = addText(doc, `Nombre: ${session_info.nombre}`, y);
    y = addText(doc, `Fecha: ${session_info.fecha}`, y);
    y = addText(doc, `Duración aprox: ${session_info.duracion_aproximada}`, y);
    y += PDF_CONFIG.lineHeight * 2;

    // Procesar acciones
    for (const accion of acciones_con_capturas) {
      if (y > PDF_CONFIG.maxY) {
        doc.addPage();
        y = PDF_CONFIG.margin;
      }

      // Agrupar textos similares
      const textos = [
        `Paso ${accion.id} - ${accion.descripcion}`,
        `Acción: ${accion.tipo}`,
        `Texto ingresado: ${accion.texto || '-'}`,
        `Selector: ${accion.selector || '-'}`,
        `Timestamp: ${accion.timestamp || '-'}`,
        `Prioridad: ${accion.prioridad || '-'}`
      ];

      // Agregar textos con el mismo tamaño de fuente
      doc.setFontSize(11);
      y = addText(doc, textos[0], y, 11);
      doc.setFontSize(10);
      for (let i = 1; i < textos.length; i++) {
        y = addText(doc, textos[i], y);
      }

      // Manejar screenshot
      if (accion.screenshot) {
        try {
          doc.addImage(
            accion.screenshot,
            "PNG",
            PDF_CONFIG.margin + 100,
            y - 25,
            PDF_CONFIG.imageWidth,
            PDF_CONFIG.imageHeight
          );
          // Limpiar la imagen de la memoria
          accion.screenshot = null;
        } catch (e) {
          console.warn("❌ No se pudo insertar screenshot:", e);
        }
      }

      y += 50;
    }

    doc.save(`${session_info.nombre}.pdf`);
    updateUIState(false, 'Reporte generado exitosamente');
    
    // Limpiar el mensaje después de 3 segundos
    setTimeout(() => {
      updateUIState(false);
    }, 3000);

  } catch (error) {
    console.error("Error al generar el PDF:", error);
    updateUIState(false, '', `Error: ${error.message}`);
  }
});

// Agregar event listener para el botón de descarga de DOM
downloadDOMButton.addEventListener('click', downloadDOM);
