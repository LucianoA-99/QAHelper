// Configuración y constantes
const CONFIG = {
  MAX_SCREENSHOT_SIZE: 1024 * 1024, // 1MB
  SESSION_TIMEOUT: 30 * 60 * 1000, // 30 minutos
  MAX_ACTIONS: 1000,
  SCREENSHOT_QUALITY: 80
};

// Estado de la sesión
class SessionState {
  constructor() {
    this.actions = [];
    this.domElements = new Set();
    this.startTime = Date.now();
    this.lastActionTime = Date.now();
  }

  addAction(action) {
    if (this.actions.length >= CONFIG.MAX_ACTIONS) {
      this.actions.shift(); // Eliminar la acción más antigua
    }
    this.actions.push(action);
    this.lastActionTime = Date.now();
  }

  addDomElements(elements) {
    elements.forEach(el => this.domElements.add(el));
  }

  isExpired() {
    return Date.now() - this.lastActionTime > CONFIG.SESSION_TIMEOUT;
  }

  clear() {
    this.actions = [];
    this.domElements.clear();
    this.startTime = Date.now();
    this.lastActionTime = Date.now();
  }
}

// Instancia del estado de la sesión
const sessionState = new SessionState();

// Función para optimizar y comprimir screenshots
async function optimizeScreenshot(screenshotUrl) {
  try {
    const response = await fetch(screenshotUrl);
    const blob = await response.blob();
    
    if (blob.size > CONFIG.MAX_SCREENSHOT_SIZE) {
      // En el service worker no podemos usar canvas, así que simplemente
      // usamos la URL original si el tamaño es muy grande
      console.warn('Screenshot demasiado grande, usando versión sin optimización');
    }
    
    return screenshotUrl;
  } catch (error) {
    console.error('Error optimizando screenshot:', error);
    return screenshotUrl;
  }
}

// Función para enriquecer la información de la acción
function enrichActionData(action) {
  const enriched = {
    ...action,
    metadata: {
      timestamp: new Date().toISOString()
    }
  };

  // Determinar prioridad basada en el tipo de acción
  enriched.priority = determinePriority(action.type);

  // Generar descripción basada en el tipo de acción
  enriched.descripcion = generateDescription(action);

  return enriched;
}

// Función para generar la descripción de la acción
function generateDescription(action) {
  const { type, text, selector } = action;
  
  switch (type) {
    case 'click':
      return text ? `Click en "${text}"` : 'Click en elemento';
    case 'input':
      return text ? `Ingreso de texto: "${text}"` : 'Ingreso de texto';
    case 'submit':
      return 'Envío de formulario';
    case 'change':
      return text ? `Cambio de valor: "${text}"` : 'Cambio de valor';
    case 'enter':
      return 'Presión de tecla Enter';
    default:
      return `Acción tipo ${type}`;
  }
}

// Función para determinar la prioridad de una acción
function determinePriority(actionType) {
  const priorityMap = {
    'submit': 'high',
    'input': 'high',
    'click': 'medium',
    'change': 'medium',
    'enter': 'low'
  };
  return priorityMap[actionType] || 'low';
}

// Función para generar casos exploratorios mejorados
function generateExploratoryCases(actions) {
  const tours = [];
  const actionStats = analyzeActionStats(actions);

  // Landmark Tour
  if (actionStats.clickCount >= 1) {
    tours.push(createTour('Landmark', {
      objetivo: "Validar elementos clave y navegación principal",
      pasos: [
        "Identificar y hacer clic en elementos principales",
        "Verificar navegación y respuestas",
        "Validar estados de carga y transiciones"
      ],
      criterios: ["Navegación correcta", "Respuestas inmediatas", "Estados visibles"]
    }));
  }

  // Garbage Collector Tour
  if (actionStats.inputCount >= 1) {
    tours.push(createTour('Garbage', {
      objetivo: "Probar validación y manejo de datos inválidos",
      pasos: [
        "Ingresar caracteres especiales y emojis",
        "Probar límites de longitud",
        "Validar mensajes de error"
      ],
      criterios: ["Validación robusta", "Mensajes claros", "Recuperación elegante"]
    }));
  }

  // FedEx Tour
  if (actionStats.submitCount >= 1) {
    tours.push(createTour('FedEx', {
      objetivo: "Optimizar flujos principales",
      pasos: [
        "Identificar campos requeridos",
        "Completar mínimo necesario",
        "Validar eficiencia"
      ],
      criterios: ["Flujo eficiente", "Guía clara", "Validación oportuna"]
    }));
  }

  // All-nighter Tour
  if (actionStats.repeatedActions.length > 0) {
    tours.push(createTour('AllNighter', {
      objetivo: "Probar resistencia a uso intensivo",
      pasos: [
        "Repetir acciones frecuentes",
        "Monitorear rendimiento",
        "Verificar estabilidad"
      ],
      criterios: ["Sin degradación", "Manejo de memoria", "Respuesta consistente"]
    }));
  }

  return tours;
}

// Función auxiliar para crear tours
function createTour(name, data) {
  return {
    name: `${name} Tour`,
    ...data,
    metadata: {
      created: new Date().toISOString(),
      version: '1.0'
    }
  };
}

// Función para analizar estadísticas de acciones
function analyzeActionStats(actions) {
  const stats = {
    clickCount: 0,
    inputCount: 0,
    submitCount: 0,
    repeatedActions: []
  };

  const actionCounts = new Map();

  actions.forEach(action => {
    stats[`${action.action.type}Count`]++;
    
    const key = `${action.action.type}-${action.action.selector}`;
    const count = (actionCounts.get(key) || 0) + 1;
    actionCounts.set(key, count);
    
    if (count >= 3) {
      stats.repeatedActions.push({
        type: action.action.type,
        selector: action.action.selector,
        count
      });
    }
  });

  return stats;
}

// Función para calcular cobertura UI mejorada
function calcularCoberturaUI(actions, domElements) {
  const usedSelectors = new Set(actions.map(a => a.action.selector));
  const unusedElements = Array.from(domElements).filter(el => !usedSelectors.has(el));

  return {
    metrics: {
      total: domElements.size,
      covered: usedSelectors.size,
      uncovered: unusedElements.length,
      coverage: (usedSelectors.size / domElements.size * 100).toFixed(2) + '%'
    },
    details: {
      used: Array.from(usedSelectors),
      unused: unusedElements
    },
    recommendations: generateCoverageRecommendations(usedSelectors, unusedElements)
  };
}

// Función para generar recomendaciones de cobertura
function generateCoverageRecommendations(used, unused) {
  const recommendations = [];
  
  if (unused.length > 0) {
    recommendations.push({
      type: 'coverage',
      message: `Hay ${unused.length} elementos sin cobertura`,
      priority: 'medium',
      elements: unused.slice(0, 5) // Mostrar solo los primeros 5
    });
  }

  return recommendations;
}

// Event Listeners
chrome.runtime.onInstalled.addListener(() => {
  console.log("✅ QA Copilot activado");
  sessionState.clear();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sessionState.isExpired()) {
    sessionState.clear();
  }

  switch (message.type) {
    case 'capturedAction':
      chrome.tabs.captureVisibleTab(null, { 
        format: "jpeg", 
        quality: CONFIG.SCREENSHOT_QUALITY 
      })
        .then(async (screenshotUrl) => {
          const optimizedScreenshot = await optimizeScreenshot(screenshotUrl);
          const enrichedAction = enrichActionData(message.action);
          
          sessionState.addAction({
            action: enrichedAction,
            screenshot: optimizedScreenshot
          });
          
          console.log("📸 Acción registrada:", enrichedAction);
        })
        .catch(error => {
          console.error("❌ Error capturando screenshot:", error);
          sessionState.addAction({
            action: enrichActionData(message.action),
            screenshot: null
          });
        });
      break;

    case 'elementosDOM':
      sessionState.addDomElements(message.elementos);
      console.log("📦 Elementos DOM actualizados:", sessionState.domElements.size);
      break;

    case 'getSessionData':
      const exploratoryTests = generateExploratoryCases(sessionState.actions);
      const cobertura = calcularCoberturaUI(sessionState.actions, sessionState.domElements);

      const sessionInfo = {
        nombre: `session_${new Date().toISOString().replace(/[:.]/g, "-")}`,
        fecha: new Date().toISOString(),
        duracion_aproximada: `${Math.round((Date.now() - sessionState.startTime) / 1000)}s`,
        metadata: {
          actions: sessionState.actions.length,
          elements: sessionState.domElements.size
        }
      };

      // Procesar las acciones para el reporte
      const accionesProcesadas = sessionState.actions.map((entry, index) => {
        const action = entry.action;
        return {
          id: index + 1,
          tipo: action.type,
          descripcion: action.descripcion || generateDescription(action),
          timestamp: action.timestamp || action.metadata?.timestamp,
          texto: action.text || '-',
          selector: action.selector || '-',
          screenshot: entry.screenshot,
          prioridad: action.priority || determinePriority(action.type)
        };
      });

      sendResponse({
        session_info: sessionInfo,
        acciones_con_capturas: accionesProcesadas,
        casos_exploratorios: exploratoryTests,
        cobertura_ui: cobertura
      });
      break;
  }
});
