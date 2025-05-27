// src/form-builder.js
import { topLeftStyle, injectDarkThemeStyles } from './ui-styles.js';
import { rollTechCheck } from './roll.js';

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

  createField('Character Name', 'characterName', 'Vail');
  createField('Skill Name', 'skillName', 'Tech');
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
    const mods = Array.from(
      document.querySelectorAll('#staticModifiersContainer .static-modifier-row')
    ).map(row => ({
      name: row.querySelector('.mod-name').value.trim(),
      value: +row.querySelector('.mod-value').value || 0
    })).filter(m => m.name && m.value !== 0);

    rollTechCheck({
      characterName: document.getElementById('characterName').value.trim(),
      skillName: document.getElementById('skillName').value.trim(),
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
  valueInput.type = 'number';
  valueInput.value = value;
  valueInput.style.width = '50px';

  const del = document.createElement('button');
  del.type = 'button';
  del.textContent = '×';
  del.title = 'Remove';
  del.style.cursor = 'pointer';
  del.addEventListener('click', () => row.remove());

  row.append(nameInput, valueInput, del);
  container.appendChild(row);
}
