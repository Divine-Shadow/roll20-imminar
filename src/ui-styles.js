// src/ui-styles.js
export const topLeftStyle = {
  position: 'fixed',
  top: '10px',
  left: '10px',
  zIndex: 10000,
  backgroundColor: '#1e1e1e',
  color: '#f0f0f0',
  border: '1px solid #444',
  padding: '10px',
  boxShadow: '2px 2px 5px rgba(0,0,0,0.8)',
  maxWidth: '260px',
  fontFamily: 'sans-serif',
  fontSize: '14px',
  borderRadius: '6px',
};

export function injectDarkThemeStyles() {
  const style = document.createElement('style');
  style.textContent = `
    #roll-helper-form input,
    #roll-helper-form button {
      background-color: #2b2b2b;
      color: #f0f0f0;
      border: 1px solid #555;
      border-radius: 4px;
      padding: 4px;
    }
    #roll-helper-form input:focus {
      outline: none;
      border-color: #888;
    }
    #roll-helper-form label { color: #ccc; }
    #roll-helper-form h3 { color: #fff; }
  `;
  document.head.appendChild(style);
}
