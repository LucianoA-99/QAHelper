function logAction(type, target, value = null) {
  const selector = getUniqueSelector(target);
  const timestamp = new Date().toISOString();
  const action = {
    type,
    selector,
    value,
    timestamp,
    text: target.innerText || target.value || '',
  };

  chrome.runtime.sendMessage({ type: 'capturedAction', action });
  console.log('📝 Acción enviada al background:', action);
}

function getUniqueSelector(el) {
  if (!el) return '';
  if (el.id) return `#${el.id}`;
  if (el.name) return `[name="${el.name}"]`;
  if (typeof el.className === 'string') {
    return `${el.tagName.toLowerCase()}.${el.className.split(' ').join('.')}`;
  }  
  return el.tagName.toLowerCase();
}

// Capturar acciones
document.addEventListener('click', (e) => logAction('click', e.target));
document.addEventListener('input', (e) => logAction('input', e.target, e.target.value));
document.addEventListener('submit', (e) => logAction('submit', e.target));

// 🧠 Enviar elementos del DOM al background para análisis de cobertura
window.addEventListener("load", () => {
  const elementos = document.querySelectorAll("input, button, select, textarea, a");
  const todos = Array.from(elementos).map(el => getUniqueSelector(el));
  const unicos = [...new Set(todos)];

  chrome.runtime.sendMessage({ type: 'elementosDOM', elementos: unicos });
});
