// src/main.js
import { buildRollForm } from './form-builder.js';

// your defaults for static modifiers
const staticModifiersConfig = [
  { label: 'Food Bonus', default: 2 },
  { label: 'Inspiration Bonus', default: 1 },
];

function isRoll20ChatAvailable(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const chatInput = document.querySelector('#textchat-input textarea');
  const sendButton = document.querySelector('#chatSendBtn');
  return Boolean(chatInput && sendButton);
}

function showRoll20RequiredMessage(): void {
  const message =
    'Roll20 Imminar is not active on this page. Open your Roll20 game and click the bookmark there.';

  if (typeof alert === 'function') {
    alert(message);
    return;
  }

  console.warn(message);
}

if (isRoll20ChatAvailable()) {
  buildRollForm(staticModifiersConfig);
} else {
  showRoll20RequiredMessage();
}
