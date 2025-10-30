// src/form-builder.js
import { topLeftStyle, injectDarkThemeStyles } from './ui-styles.js';
import { rollSkillCheck } from './rollSkillCheck.ts';
import { skillOptions } from './skill-options.js';
import { rollDie } from './random.ts';
import {
  parseStaticModifierExpression,
  evaluateParsedStaticModifier
} from './static-modifier-parser.ts';
import { showInputError, clearInputError } from './ui-validation.ts';

const modifierParseCache = new WeakMap();

export function buildRollForm(config = []) {
  injectDarkThemeStyles();

  const formDiv = document.createElement('div');
  Object.assign(formDiv.style, topLeftStyle);
  formDiv.id = 'roll-helper-form';

  const form = document.createElement('form');
  form.id = 'customRollForm';

  // Header + Close button
  const heading = document.createElement('h3');
  heading.textContent = 'Roll Settings';
  heading.style.marginTop = '0';
  form.appendChild(heading);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  Object.assign(closeBtn.style, {
    float: 'right', marginTop: '-28px', marginRight: '-5px',
    fontSize: '16px', border: 'none', background: 'none',
    cursor: 'pointer', color: '#aaa',
  });
  closeBtn.addEventListener('click', () => formDiv.remove());
  form.appendChild(closeBtn);

  // Simple text/number field creator
  function createField(labelText, id, defaultValue = '') {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = `${labelText}: `;
    const input = document.createElement('input');
    input.id = id;
    input.value = defaultValue;
    input.style.width = '100%';
    input.style.marginBottom = '4px';
    label.appendChild(input);
    wrapper.appendChild(label);
    form.appendChild(wrapper);
  }

  function createSkillField(defaultValue = '') {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = 'Skill Name: ';
    const input = document.createElement('input');
    input.id = 'skillName';
    input.setAttribute('list', 'skillList');
    input.value = defaultValue;
    input.style.width = '100%';
    input.style.marginBottom = '4px';
    label.appendChild(input);
    wrapper.appendChild(label);

    const list = document.createElement('datalist');
    list.id = 'skillList';
    skillOptions.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      list.appendChild(option);
    });
    wrapper.appendChild(list);

    const custom = document.createElement('input');
    custom.id = 'customSkillName';
    custom.placeholder = 'Custom Skill';
    custom.style.width = '100%';
    custom.style.marginTop = '4px';
    custom.style.display = 'none';
    wrapper.appendChild(custom);

    input.addEventListener('input', () => {
      if (input.value.trim().toLowerCase() === 'other') {
        custom.style.display = '';
      } else {
        custom.style.display = 'none';
      }
    });

    form.appendChild(wrapper);
  }

  createField('Character Name', 'characterName', 'Vail');
  createSkillField('Tech');
  createField('Roll Title', 'customTitle', '');

  // Static modifiers area
  const container = document.createElement('div');
  container.id = 'staticModifiersContainer';
  form.appendChild(createStaticModifiersSection(config, container));

  // Checkboxes
  ['Use Luck','Advantage'].forEach((labelText, idx) => {
    const id = labelText.toLowerCase().replace(' ', '');
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = `${labelText}: `;
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = id;
    cb.checked = true;
    label.appendChild(cb);
    wrapper.appendChild(label);
    form.appendChild(wrapper);
  });

  // Roll button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Roll!';
  submitBtn.style.marginTop = '6px';
  form.appendChild(submitBtn);

  formDiv.appendChild(form);
  document.body.appendChild(formDiv);

  form.addEventListener('submit', e => {
    e.preventDefault();
    const rows = Array.from(
      document.querySelectorAll('#staticModifiersContainer .static-modifier-row')
    );

    const mods = [];
    let hasErrors = false;

    rows.forEach(row => {
      const nameInput = row.querySelector('.mod-name');
      const valueInput = row.querySelector('.mod-value');
      const name = nameInput.value.trim();

      if (!name) {
        return;
      }

      const parsed = ensureParsedModifier(valueInput);
      if (!parsed.ok) {
        hasErrors = true;
        return;
      }

      const evaluated = evaluateParsedStaticModifier(parsed.value, rollDie);
      if (evaluated.kind === 'constant') {
        mods.push({
          name,
          kind: 'constant',
          total: evaluated.total,
          value: evaluated.value
        });
      } else {
        mods.push({
          name,
          kind: 'dice',
          total: evaluated.total,
          expression: evaluated.expression,
          dice: evaluated.dice
        });
      }
    });

    if (hasErrors) {
      return;
    }

    const dropdownValue = document.getElementById('skillName').value.trim();
    const custom = document.getElementById('customSkillName');
    const skill =
      dropdownValue.toLowerCase() === 'other'
        ? custom.value.trim()
        : dropdownValue;

    rollSkillCheck({
      characterName: document.getElementById('characterName').value.trim(),
      skillName: skill,
      customTitle: document.getElementById('customTitle').value.trim(),
      useLuck: document.getElementById('useluck').checked,
      advantage: document.getElementById('advantage').checked,
      staticModifiers: mods,
    });
  });
}

// Helper to build the static modifiers block
function createStaticModifiersSection(config, container) {
  const section = document.createElement('div');
  section.style.marginTop = '8px';

  const heading = document.createElement('div');
  heading.textContent = 'Static Modifiers:';
  heading.style.fontWeight = 'bold';
  section.appendChild(heading);

  section.appendChild(container);

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.textContent = '+ Add Modifier';
  addBtn.style.marginTop = '4px';
  addBtn.addEventListener('click', () => addStaticModifierRow('', 0, container));
  section.appendChild(addBtn);

  // Pre-populate
  config.forEach(({ label, default: value }) =>
    addStaticModifierRow(label, value, container)
  );

  return section;
}

function normalizeExpressionValue(value) {
  return value.trim().replace(/\s+/g, ' ');
}

function validateModifierInput(input) {
  const raw = input.value;
  const trimmed = raw.trim();

  if (trimmed.length === 0) {
    modifierParseCache.delete(input);
    clearInputError(input);
    return;
  }

  const result = parseStaticModifierExpression(trimmed);
  if (result.ok) {
    modifierParseCache.set(input, result.value);
    clearInputError(input);
  } else {
    modifierParseCache.delete(input);
    showInputError(input, result.error);
  }
}

function ensureParsedModifier(input) {
  const trimmed = input.value.trim();
  if (trimmed.length === 0) {
    showInputError(input, 'Enter a number or dice expression');
    return { ok: false };
  }

  const normalized = normalizeExpressionValue(trimmed);
  const cached = modifierParseCache.get(input);
  if (cached && cached.source === normalized) {
    return { ok: true, value: cached };
  }

  const result = parseStaticModifierExpression(trimmed);
  if (result.ok) {
    modifierParseCache.set(input, result.value);
    clearInputError(input);
    return { ok: true, value: result.value };
  }

  showInputError(input, result.error);
  return { ok: false };
}

function addStaticModifierRow(name, value, container) {
  const row = document.createElement('div');
  row.className = 'static-modifier-row';
  Object.assign(row.style, { display: 'flex', gap: '4px', marginBottom: '4px' });

  const nameInput = document.createElement('input');
  nameInput.className = 'mod-name';
  nameInput.placeholder = 'Name';
  nameInput.value = name;
  nameInput.style.flex = '2';

  const valueInput = document.createElement('input');
  valueInput.className = 'mod-value';
  valueInput.type = 'text';
  valueInput.value = value;
  valueInput.style.width = '90px';
  valueInput.addEventListener('input', () => validateModifierInput(valueInput));
  valueInput.addEventListener('blur', () => validateModifierInput(valueInput));
  if (value !== '') {
    validateModifierInput(valueInput);
  }

  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = '×';
  del.title = 'Remove';
  del.style.cursor = 'pointer';
  del.addEventListener('click', () => row.remove());

  row.append(nameInput, valueInput, del);
  container.appendChild(row);
}
