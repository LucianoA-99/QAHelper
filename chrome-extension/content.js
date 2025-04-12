// Constantes y configuración
const CONFIG = {
  DEBOUNCE_TIME: 300,
  MAX_SELECTOR_LENGTH: 100,
  ELEMENTS_TO_TRACK: ['input', 'button', 'select', 'textarea', 'a', '[role="button"]', '[role="link"]']
};

// Cache para selectores únicos
const selectorCache = new WeakMap();

// Función para obtener un selector único optimizado
function getUniqueSelector(el) {
  if (!el || !(el instanceof Element)) return '';

  // Verificar cache
  if (selectorCache.has(el)) {
    return selectorCache.get(el);
  }

  let selector = '';
  
  // Intentar con ID primero
  if (el.id) {
    selector = `#${el.id}`;
  } 
  // Intentar con name
  else if (el.name) {
    selector = `[name="${el.name}"]`;
  }
  // Intentar con clases
  else if (typeof el.className === 'string' && el.className) {
    const classes = el.className.split(' ').filter(c => c).join('.');
    if (classes) {
      selector = `${el.tagName.toLowerCase()}.${classes}`;
    }
  }
  // Fallback a tag name
  else {
    selector = el.tagName.toLowerCase();
  }

  // Verificar si el selector es único
  if (document.querySelectorAll(selector).length === 1) {
    selectorCache.set(el, selector);
    return selector;
  }

  // Si no es único, construir un selector más específico
  const path = [];
  let current = el;
  
  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.id) {
      selector += `#${current.id}`;
    } else if (current.className && typeof current.className === 'string') {
      const classes = current.className.split(' ').filter(c => c).join('.');
      if (classes) selector += `.${classes}`;
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }
  
  const fullSelector = path.join(' > ');
  selectorCache.set(el, fullSelector);
  return fullSelector;
}

// Función para obtener el texto relevante de un elemento
function getElementText(el) {
  if (!el) return '';
  
  // Para inputs y textareas
  if (el.value !== undefined) return el.value;
  
  // Para elementos con texto
  const text = el.innerText || el.textContent;
  return text ? text.trim() : '';
}

// Función para registrar acciones con debounce
const debouncedLogAction = (() => {
  let timeout;
  return (type, target, value = null) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      const selector = getUniqueSelector(target);
      if (!selector || selector.length > CONFIG.MAX_SELECTOR_LENGTH) return;

      const action = {
        type,
        selector,
        value,
        timestamp: new Date().toISOString(),
        text: getElementText(target),
        url: window.location.href,
        title: document.title
      };

      try {
        chrome.runtime.sendMessage({ type: 'capturedAction', action });
        console.log('📝 Acción registrada:', action);
      } catch (error) {
        console.error('❌ Error al enviar acción:', error);
      }
    }, CONFIG.DEBOUNCE_TIME);
  };
})();

// Función para analizar elementos del DOM
function analyzeDOM() {
  try {
    const elementos = document.querySelectorAll(CONFIG.ELEMENTS_TO_TRACK.join(','));
    const selectores = new Set();
    
    elementos.forEach(el => {
      const selector = getUniqueSelector(el);
      if (selector && selector.length <= CONFIG.MAX_SELECTOR_LENGTH) {
        selectores.add(selector);
      }
    });

    chrome.runtime.sendMessage({ 
      type: 'elementosDOM', 
      elementos: Array.from(selectores),
      url: window.location.href,
      title: document.title
    });
  } catch (error) {
    console.error('❌ Error al analizar DOM:', error);
  }
}

// Event Listeners optimizados
const eventListeners = {
  click: (e) => debouncedLogAction('click', e.target),
  input: (e) => debouncedLogAction('input', e.target, e.target.value),
  change: (e) => debouncedLogAction('change', e.target, e.target.value),
  submit: (e) => debouncedLogAction('submit', e.target),
  keydown: (e) => {
    if (e.key === 'Enter' && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      debouncedLogAction('enter', e.target, e.target.value);
    }
  }
};

// Registrar event listeners
Object.entries(eventListeners).forEach(([event, handler]) => {
  document.addEventListener(event, handler, { capture: true, passive: true });
});

// Analizar DOM al cargar y en cambios dinámicos
window.addEventListener('load', analyzeDOM);

// Observar cambios en el DOM
const observer = new MutationObserver((mutations) => {
  if (mutations.some(mutation => mutation.addedNodes.length > 0)) {
    analyzeDOM();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});
