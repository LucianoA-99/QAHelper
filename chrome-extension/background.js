let sessionActions = [];
let elementosDelDom = [];

chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ QA Copilot con cobertura, exploratorios y metadatos activado");
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'capturedAction') {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (screenshotUrl) => {
      const entry = {
        action: message.action,
        screenshot: screenshotUrl
      };
      sessionActions.push(entry);
      console.log("📸 Acción + captura registrada:", entry);
    });
  } else if (message.type === 'elementosDOM') {
    elementosDelDom = message.elementos || [];
    console.log("📦 Elementos interactuables del DOM recibidos:", elementosDelDom.length);
  } else if (message.type === 'getSessionData') {
    const exploratoryTests = generateExploratoryCases(sessionActions);
    const cobertura = calcularCoberturaUI(sessionActions, elementosDelDom);

    // ✅ Agregar metadatos enriquecidos
    const ahora = new Date().toISOString();
    const nombreSesion = `session_${ahora.replace(/[:.]/g, "-")}`;

    const accionesEnriquecidas = sessionActions.map((entry, index) => {
      const act = entry.action;
      const tipo = act.type;
      const texto = act.text?.trim() || "";
      let descripcion = "";
      let prioridad = "Media";

      if (tipo === "click") {
        descripcion = texto
          ? `Click en botón "${texto}"`
          : "Click en un botón o enlace";
        prioridad = "Alta";
      } else if (tipo === "input") {
        descripcion = `Ingreso de texto "${texto}"`;
        prioridad = "Alta";
      } else if (tipo === "submit") {
        descripcion = "Envío de formulario";
        prioridad = "Alta";
      } else {
        descripcion = `Acción tipo ${tipo}`;
        prioridad = "Media";
      }

      return {
        id: index + 1,
        tipo,
        descripcion,
        timestamp: act.timestamp,
        texto,
        screenshot: entry.screenshot,
        prioridad
      };
    });

    const session_info = {
      nombre: nombreSesion,
      fecha: ahora,
      duracion_aproximada: accionesEnriquecidas.length * 2 + "s"
    };

    console.log("📤 Enviando datos a popup...");
    console.log({
    session_info,
    acciones_con_capturas: accionesEnriquecidas,
    casos_exploratorios: exploratoryTests,
    cobertura_ui: cobertura
    });


    sendResponse({
      session_info,
      acciones_con_capturas: accionesEnriquecidas,
      casos_exploratorios: exploratoryTests,
      cobertura_ui: cobertura
    });
  }
});

function generateExploratoryCases(actions) {
  const tours = [];

  const inputActions = actions.filter(a => a.action.type === "input");
  const clickActions = actions.filter(a => a.action.type === "click");
  const submitActions = actions.filter(a => a.action.type === "submit");

  const selectors = actions.map(a => a.action.selector);
  const inputCount = inputActions.length;
  const clickCount = clickActions.length;

  // Landmark Tour
  if (clickCount >= 1) {
    tours.push({
      tour: "Landmark Tour",
      objetivo: "Validar que los elementos clave respondan correctamente.",
      pasos: ["Hacer clic en botones relevantes", "Verificar navegación o acciones resultantes"],
      resultado_esperado: "Cada botón debe llevar al lugar correcto o ejecutar la acción esperada."
    });
  }

  // Garbage Collector Tour
  if (inputCount >= 1) {
    tours.push({
      tour: "Garbage Collector Tour",
      objetivo: "Probar campos con datos inválidos o basura.",
      pasos: ["Ingresar caracteres especiales, emojis o texto largo en campos", "Observar la validación o errores generados"],
      resultado_esperado: "El sistema debe validar correctamente los datos o mostrar errores claros."
    });
  }

  // FedEx Tour
  if (clickCount <= 4 && submitActions.length >= 1) {
    tours.push({
      tour: "FedEx Tour",
      objetivo: "Completar el flujo principal de forma eficiente.",
      pasos: ["Rellenar solo los campos mínimos requeridos", "Hacer submit", "Observar resultado"],
      resultado_esperado: "El sistema permite avanzar con la mínima información necesaria."
    });
  }

  // All-nighter Tour
  const repeticiones = selectors.reduce((map, sel) => {
    map[sel] = (map[sel] || 0) + 1;
    return map;
  }, {});
  if (Object.values(repeticiones).some(count => count >= 3)) {
    tours.push({
      tour: "All-nighter Tour",
      objetivo: "Ver si repetir acciones causa fallos acumulados.",
      pasos: ["Repetir varias veces una misma acción como escribir o hacer click", "Verificar errores o cuelgues"],
      resultado_esperado: "El sistema no debe degradarse ni duplicar acciones por errores."
    });
  }

  // Saboteur Tour
  if (inputCount >= 2 && submitActions.length >= 1) {
    tours.push({
      tour: "Saboteur Tour",
      objetivo: "Forzar errores a propósito para probar la resiliencia.",
      pasos: ["Dejar campos vacíos o con datos erróneos", "Intentar enviar el formulario"],
      resultado_esperado: "El sistema debe bloquear la acción y mostrar mensajes útiles."
    });
  }

  // After-hours Tour
  if (actions.length >= 5 && actions[0].action.type === "click" && actions[1].action.type === "submit") {
    tours.push({
      tour: "After-hours Tour",
      objetivo: "Ver qué pasa si se usan flujos atípicos o incompletos.",
      pasos: ["Saltear pasos intermedios", "Ir directo a un botón final", "Observar comportamiento del sistema"],
      resultado_esperado: "El sistema debe guiar o advertir al usuario si falta completar algo."
    });
  }

  return tours;
}

function calcularCoberturaUI(sessionActions, domElements) {
  const usados = sessionActions.map(a => a.action.selector);
  const usadosUnicos = [...new Set(usados)];
  const noTocados = domElements.filter(sel => !usadosUnicos.includes(sel));

  return {
    total: domElements.length,
    tocados: usadosUnicos.length,
    no_tocados: noTocados.length,
    detalle: noTocados
  };
}
