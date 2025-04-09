const { jsPDF } = window.jspdf;

document.getElementById('export').addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'getSessionData' }, (response) => {
    if (!response || Object.keys(response).length === 0) {
      alert("⚠️ No se recibió información válida. Verificá la sesión.");
      return;
    }

    const { session_info, acciones_con_capturas } = response;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    doc.setFontSize(14);
    doc.text(`QA Session Report`, 10, 10);
    doc.setFontSize(10);
    doc.text(`Nombre: ${session_info.nombre}`, 10, 16);
    doc.text(`Fecha: ${session_info.fecha}`, 10, 21);
    doc.text(`Duración aprox: ${session_info.duracion_aproximada}`, 10, 26);

    let y = 35;

    acciones_con_capturas.forEach((accion, index) => {
      if (y > 250) {
        doc.addPage();
        y = 10;
      }

      doc.setFontSize(11);
      doc.text(`Paso ${accion.id} - ${accion.descripcion}`, 10, y);
      y += 6;
      doc.setFontSize(10);
      doc.text(`Acción: ${accion.tipo}`, 10, y);
      y += 5;
      doc.text(`Texto ingresado: ${accion.texto || '-'}`, 10, y);
      y += 5;
      doc.text(`Selector: ${accion.selector || '-'}`, 10, y);
      y += 5;
      doc.text(`Timestamp: ${accion.timestamp || '-'}`, 10, y);
      y += 5;
      doc.text(`Prioridad: ${accion.prioridad || '-'}`, 10, y);
      y += 5;

      if (accion.screenshot) {
        try {
          doc.addImage(accion.screenshot, "PNG", 110, y - 25, 80, 45);
        } catch (e) {
          console.warn("❌ No se pudo insertar screenshot:", e);
        }
      }

      y += 50;
    });

    doc.save(`${session_info.nombre}.pdf`);
  });
});
