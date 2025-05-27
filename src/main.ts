// src/main.js
import { buildRollForm } from './form-builder.js';

// your defaults for static modifiers
const staticModifiersConfig = [
  { label: 'Food Bonus', default: 2 },
  { label: 'Inspiration Bonus', default: 1 },
];

buildRollForm(staticModifiersConfig);
