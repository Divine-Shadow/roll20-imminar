// src/form-builder.js
import { topLeftStyle, injectDarkThemeStyles } from './ui-styles.js';
import { rollSkillCheck } from './rollSkillCheck.ts';
import { skillOptions } from './skill-options.js';
import { rollDie } from './random.ts';
import { parseSaveData } from './save-data-parser.ts';
import {
  parseStaticModifierExpression,
  evaluateParsedStaticModifier
} from './static-modifier-parser.ts';
import { showInputError, clearInputError } from './ui-validation.ts';

const modifierParseCache = new WeakMap();
const DATA_SOURCE_STORAGE_KEY = 'roll20-imminar:data-source';
const SAVE_DATA_STORAGE_KEY = 'roll20-imminar:save-data';

export function buildRollForm(config = [], initialSaveData) {
  injectDarkThemeStyles();
  let currentSaveData = initialSaveData ?? loadPersistedSaveData();
  let skillInputRef;
  let skillListRef;
  let sourceSelectRef;
  let roll20CharacterWrapperRef;
  let roll20CharacterListRef;
  let sourceSelectionRequired = false;
  let mainContentRef;

  const formDiv = document.createElement('div');
  Object.assign(formDiv.style, topLeftStyle);
  formDiv.id = 'roll-helper-form';
  formDiv.style.boxSizing = 'border-box';
  formDiv.style.width = 'min(360px, calc(100vw - 24px))';
  formDiv.style.maxHeight = '85vh';
  formDiv.style.overflowY = 'auto';

  const form = document.createElement('form');
  form.id = 'customRollForm';
  form.style.position = 'relative';

  function makePanelDraggable(handle, panel) {
    let dragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const onMouseMove = event => {
      if (!dragging) {
        return;
      }

      const rawLeft = event.clientX - offsetX;
      const rawTop = event.clientY - offsetY;
      const maxLeft = Math.max(0, window.innerWidth - panel.offsetWidth);
      const maxTop = Math.max(0, window.innerHeight - panel.offsetHeight);
      const clampedLeft = Math.min(Math.max(0, rawLeft), maxLeft);
      const clampedTop = Math.min(Math.max(0, rawTop), maxTop);

      panel.style.left = `${clampedLeft}px`;
      panel.style.top = `${clampedTop}px`;
      panel.style.right = 'auto';
      panel.style.bottom = 'auto';
    };

    const onMouseUp = () => {
      dragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', event => {
      dragging = true;
      const panelLeft = parseInt(panel.style.left || '0', 10);
      const panelTop = parseInt(panel.style.top || '0', 10);
      offsetX = event.clientX - panelLeft;
      offsetY = event.clientY - panelTop;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  // Header + Close button
  const heading = document.createElement('h3');
  heading.textContent = 'Roll Settings';
  heading.style.margin = '0 92px 8px 0';
  heading.style.cursor = 'move';
  heading.style.userSelect = 'none';
  form.appendChild(heading);
  makePanelDraggable(heading, formDiv);

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.textContent = '×';
  Object.assign(closeBtn.style, {
    position: 'absolute',
    top: '0',
    right: '0',
    fontSize: '16px', border: 'none', background: 'none',
    cursor: 'pointer', color: '#aaa',
    lineHeight: '1',
    padding: '2px 4px'
  });
  closeBtn.addEventListener('click', () => formDiv.remove());
  form.appendChild(closeBtn);

  const dataBtn = document.createElement('button');
  dataBtn.type = 'button';
  dataBtn.textContent = 'Data';
  Object.assign(dataBtn.style, {
    position: 'absolute',
    top: '0',
    right: '28px',
    fontSize: '11px',
    border: '1px solid #555',
    borderRadius: '4px',
    background: '#1f1f1f',
    color: '#ddd',
    cursor: 'pointer',
    padding: '2px 6px'
  });
  form.appendChild(dataBtn);

  function setDataButtonState() {
    const isSaveSource = sourceSelectRef && sourceSelectRef.value === 'save-file';
    const hasSaveData = Boolean(currentSaveData);

    if (isSaveSource && hasSaveData) {
      dataBtn.textContent = 'Data ✓';
      dataBtn.style.borderColor = '#3c7';
      dataBtn.style.color = '#d6ffe5';
      return;
    }

    if (isSaveSource && !hasSaveData) {
      dataBtn.textContent = 'Data !';
      dataBtn.style.borderColor = '#996a22';
      dataBtn.style.color = '#ffd9a0';
      return;
    }

    dataBtn.textContent = 'Data';
    dataBtn.style.borderColor = '#555';
    dataBtn.style.color = '#ddd';
  }

  // Simple text/number field creator
  function createField(labelText, id, defaultValue = '', parent = form) {
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
    parent.appendChild(wrapper);
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

    return { wrapper, input, list, custom };
  }

  function createRollTypeToggle(parent = form) {
    const wrapper = document.createElement('div');
    const label = document.createElement('label');
    label.textContent = 'Roll Type: ';

    const select = document.createElement('select');
    select.id = 'rollType';
    select.style.width = '100%';
    select.style.marginBottom = '4px';

    const standardOpt = document.createElement('option');
    standardOpt.value = 'standard';
    standardOpt.textContent = 'Standard';

    const semigroupOpt = document.createElement('option');
    semigroupOpt.value = 'semigroup';
    semigroupOpt.textContent = 'Semigroup';

    select.append(standardOpt, semigroupOpt);
    label.appendChild(select);
    wrapper.appendChild(label);
    parent.appendChild(wrapper);

    return select;
  }

  function readCharacterName() {
    const characterInput = document.getElementById('characterName');
    return characterInput ? characterInput.value.trim() : '';
  }

  function collectRoll20CharacterNames() {
    const names = Array.from(document.querySelectorAll('#speakingas option'))
      .map(option => option.textContent?.trim() || '')
      .filter(Boolean)
      .map(name => name.replace(/\s*\(GM\)\s*$/i, ''));

    const current = readCharacterName();
    if (current) {
      names.push(current);
    }
    if (currentSaveData?.characterName) {
      names.push(currentSaveData.characterName);
    }

    return uniqueValues(names);
  }

  function syncCharacterOptions() {
    if (!roll20CharacterListRef) {
      return;
    }

    roll20CharacterListRef.innerHTML = '';
    collectRoll20CharacterNames().forEach(name => {
      const option = document.createElement('option');
      option.value = name;
      roll20CharacterListRef.appendChild(option);
    });
  }

  function loadPersistedDataSource() {
    try {
      const value = window.localStorage.getItem(DATA_SOURCE_STORAGE_KEY);
      return value === 'save-file' || value === 'roll20' ? value : null;
    } catch {
      return null;
    }
  }

  function isValidPersistedSaveData(value) {
    return Boolean(
      value &&
      typeof value === 'object' &&
      typeof value.characterName === 'string' &&
      typeof value.playerName === 'string' &&
      value.skills &&
      typeof value.skills === 'object' &&
      Array.isArray(value.attributes) &&
      Array.isArray(value.corruptionLevels)
    );
  }

  function loadPersistedSaveData() {
    try {
      const raw = window.localStorage.getItem(SAVE_DATA_STORAGE_KEY);
      if (!raw) {
        return undefined;
      }
      const parsed = JSON.parse(raw);
      return isValidPersistedSaveData(parsed) ? parsed : undefined;
    } catch {
      return undefined;
    }
  }

  function persistDataSource(value) {
    try {
      window.localStorage.setItem(DATA_SOURCE_STORAGE_KEY, value);
    } catch {
      // Ignore storage failures in restricted contexts.
    }
  }

  function persistSaveData(data) {
    try {
      if (!data) {
        window.localStorage.removeItem(SAVE_DATA_STORAGE_KEY);
        return;
      }
      window.localStorage.setItem(SAVE_DATA_STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage failures in restricted contexts.
    }
  }

  function refreshMainContentVisibility() {
    if (!mainContentRef) {
      return;
    }

    mainContentRef.style.display = sourceSelectionRequired ? 'none' : '';
  }

  function uniqueValues(values) {
    return Array.from(new Set(values.filter(v => typeof v === 'string' && v.trim().length > 0)));
  }

  function getCorruptionOptionEntries(data) {
    return data.corruptionLevels.map(level => ({
      label: `Corruption Level ${level}`,
      value: level
    }));
  }

  function buildSelectableOptions(data) {
    if (!data) {
      return skillOptions.slice();
    }

    const skillNames = Object.keys(data.skills);
    const attributeNames = data.attributes.slice();
    const corruptionLabels = getCorruptionOptionEntries(data).map(entry => entry.label);
    return uniqueValues([
      ...skillNames,
      ...attributeNames,
      ...corruptionLabels
    ]);
  }

  function toAugmentedSaveData(data) {
    if (!data) {
      return undefined;
    }

    const attributeEntries = Object.fromEntries(
      data.attributes.map(attribute => {
        const value =
          typeof data.skills[attribute] === 'number'
            ? data.skills[attribute]
            : attribute === 'Strength' && typeof data.skills.Might === 'number'
              ? data.skills.Might
              : 0;
        return [attribute, value];
      })
    );
    const corruptionEntries = Object.fromEntries(
      getCorruptionOptionEntries(data).map(entry => [entry.label, entry.value])
    );

    return {
      ...data,
      skills: {
        ...data.skills,
        ...attributeEntries,
        ...corruptionEntries
      }
    };
  }

  function syncSkillOptions() {
    if (!skillListRef) {
      return;
    }

    skillListRef.innerHTML = '';
    buildSelectableOptions(currentSaveData).forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      skillListRef.appendChild(option);
    });
  }

  function setCurrentSaveData(data) {
    currentSaveData = data;
    persistSaveData(data);
    syncSkillOptions();
    setDataButtonState();
    const characterInput = document.getElementById('characterName');
    if (
      characterInput &&
      data &&
      data.characterName &&
      (
        characterInput.value.trim().length === 0 ||
        characterInput.value.trim() === 'Vail'
      )
    ) {
      characterInput.value = data.characterName;
    }
  }

  function createDataSourceControls() {
    const wrapper = document.createElement('div');
    wrapper.id = 'dataSourcePanel';
    Object.assign(wrapper.style, {
      display: 'none',
      position: 'absolute',
      top: '38px',
      right: '0',
      width: '220px',
      background: '#141414',
      border: '1px solid #555',
      borderRadius: '8px',
      padding: '8px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
      zIndex: '10001'
    });

    const panelTitle = document.createElement('div');
    panelTitle.textContent = 'Data Source';
    panelTitle.style.fontWeight = 'bold';
    panelTitle.style.marginBottom = '6px';
    wrapper.appendChild(panelTitle);

    const sourceLabel = document.createElement('label');
    sourceLabel.textContent = 'Data Source: ';

    const sourceSelect = document.createElement('select');
    sourceSelect.id = 'dataSource';
    sourceSelect.style.width = '100%';
    sourceSelect.style.marginBottom = '4px';

    const roll20Opt = document.createElement('option');
    roll20Opt.value = 'roll20';
    roll20Opt.textContent = 'Roll20 Sheet';
    const saveOpt = document.createElement('option');
    saveOpt.value = 'save-file';
    saveOpt.textContent = 'Save File';

    sourceSelect.append(roll20Opt, saveOpt);
    const persistedSource = loadPersistedDataSource();
    sourceSelectionRequired = persistedSource === null && !currentSaveData;
    sourceSelect.value = persistedSource ?? 'save-file';
    sourceSelectRef = sourceSelect;
    sourceLabel.appendChild(sourceSelect);
    wrapper.appendChild(sourceLabel);

    const characterWrapper = document.createElement('div');
    characterWrapper.id = 'roll20CharacterWrapper';
    characterWrapper.style.marginBottom = '4px';
    roll20CharacterWrapperRef = characterWrapper;

    const characterLabel = document.createElement('label');
    characterLabel.textContent = 'Character (Roll20): ';
    const characterInput = document.createElement('input');
    characterInput.id = 'characterName';
    characterInput.value = 'Vail';
    characterInput.setAttribute('list', 'characterNameList');
    characterInput.style.width = '100%';
    characterInput.style.marginBottom = '4px';
    characterLabel.appendChild(characterInput);
    characterWrapper.appendChild(characterLabel);

    const characterList = document.createElement('datalist');
    characterList.id = 'characterNameList';
    roll20CharacterListRef = characterList;
    characterWrapper.appendChild(characterList);

    wrapper.appendChild(characterWrapper);

    const fileInput = document.createElement('input');
    fileInput.id = 'saveFileInput';
    fileInput.type = 'file';
    fileInput.accept = 'application/json,.json';
    fileInput.style.width = '100%';
    fileInput.style.marginBottom = '4px';
    wrapper.appendChild(fileInput);

    const status = document.createElement('div');
    status.id = 'saveFileStatus';
    status.style.fontSize = '12px';
    status.style.color = currentSaveData ? '#9fe0b4' : '#bbb';
    status.textContent = currentSaveData
      ? 'Loaded: saved browser data'
      : 'Select a save file, or choose Roll20 Sheet above.';
    wrapper.appendChild(status);

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.id = 'dataSourcePanelOk';
    okBtn.textContent = 'OK';
    okBtn.style.marginTop = '8px';
    okBtn.style.width = '100%';
    okBtn.addEventListener('click', () => {
      persistDataSource(sourceSelect.value);
      if (sourceSelectionRequired) {
        sourceSelectionRequired = false;
        refreshMainContentVisibility();
      }
      wrapper.style.display = 'none';
    });
    wrapper.appendChild(okBtn);

    const refreshVisibility = () => {
      const usingSaveFile = sourceSelect.value === 'save-file';
      fileInput.style.display = usingSaveFile ? '' : 'none';
      status.style.display = usingSaveFile ? '' : 'none';
      if (roll20CharacterWrapperRef) {
        roll20CharacterWrapperRef.style.display = usingSaveFile ? 'none' : '';
      }
      if (!usingSaveFile) {
        clearInputError(fileInput);
      }
      setDataButtonState();
      syncCharacterOptions();
    };

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      if (!file) {
        status.textContent = currentSaveData
          ? 'Using previously loaded save data.'
          : 'Select a save file, or choose Roll20 Sheet above.';
        return;
      }

      const reader = new FileReader();
      reader.addEventListener('load', () => {
        try {
          setCurrentSaveData(parseSaveData(String(reader.result ?? '')));
          clearInputError(fileInput);
          status.textContent = `Loaded: ${file.name}`;
          status.style.color = '#9fe0b4';
        } catch {
          setCurrentSaveData(undefined);
          showInputError(fileInput, 'Invalid save JSON file');
          status.textContent = `Failed to parse: ${file.name}`;
          status.style.color = '#ff9999';
        }
      });
      reader.readAsText(file);
    });

    sourceSelect.addEventListener('change', () => {
      persistDataSource(sourceSelect.value);
      if (sourceSelectionRequired) {
        sourceSelectionRequired = false;
        refreshMainContentVisibility();
      }
      refreshVisibility();
    });
    characterInput.addEventListener('focus', syncCharacterOptions);
    refreshVisibility();
    if (sourceSelectionRequired) {
      wrapper.style.display = 'block';
    }

    return { wrapper, sourceSelect, fileInput };
  }

  const { wrapper: dataSourceControls, sourceSelect, fileInput } = createDataSourceControls();
  formDiv.appendChild(dataSourceControls);

  dataBtn.addEventListener('click', () => {
    dataSourceControls.style.display =
      dataSourceControls.style.display === 'none' ? 'block' : 'none';
  });

  const mainContent = document.createElement('div');
  mainContent.id = 'rollMainContent';
  mainContentRef = mainContent;
  form.appendChild(mainContent);

  const setupToggleBtn = document.createElement('button');
  setupToggleBtn.type = 'button';
  setupToggleBtn.id = 'setupToggleBtn';
  setupToggleBtn.textContent = 'Hide Setup';
  setupToggleBtn.style.marginBottom = '6px';
  setupToggleBtn.style.width = '100%';
  mainContent.appendChild(setupToggleBtn);

  const setupBody = document.createElement('div');
  setupBody.id = 'setupBody';
  setupBody.style.marginBottom = '8px';
  mainContent.appendChild(setupBody);

  const quickSection = document.createElement('div');
  quickSection.id = 'quickRollSection';
  Object.assign(quickSection.style, {
    borderTop: '1px solid #3f3f3f',
    paddingTop: '8px',
    marginTop: '8px'
  });
  mainContent.appendChild(quickSection);

  createField('Roll Title', 'customTitle', '', quickSection);
  const skillField = createSkillField('Tech');
  skillInputRef = skillField.input;
  skillListRef = skillField.list;
  quickSection.appendChild(skillField.wrapper);
  const rollTypeSelect = createRollTypeToggle(setupBody);

  const standardSettings = document.createElement('div');
  standardSettings.id = 'standardSettings';
  setupBody.appendChild(standardSettings);
  syncSkillOptions();
  syncCharacterOptions();
  setDataButtonState();
  refreshMainContentVisibility();

  // Static modifiers area
  const container = document.createElement('div');
  container.id = 'staticModifiersContainer';
  standardSettings.appendChild(createStaticModifiersSection(config, container));

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
    standardSettings.appendChild(wrapper);
  });

  const semigroupInfo = document.createElement('div');
  semigroupInfo.id = 'semigroupInfo';
  semigroupInfo.style.display = 'none';
  semigroupInfo.style.marginTop = '8px';
  semigroupInfo.textContent = 'Semigroup tiers: Standard 1-20, Great 21-50, Master 51-100.';
  setupBody.appendChild(semigroupInfo);

  const refreshSetupUI = () => {
    const hidden = setupBody.style.display === 'none';
    setupBody.style.display = hidden ? '' : 'none';
    setupToggleBtn.textContent = hidden ? 'Hide Setup' : 'Show Setup';
  };
  setupToggleBtn.addEventListener('click', refreshSetupUI);

  const refreshRollTypeUI = () => {
    const semigroupSelected = rollTypeSelect.value === 'semigroup';
    skillField.wrapper.style.display = semigroupSelected ? 'none' : '';
    const setupHidden = setupBody.style.display === 'none';
    standardSettings.style.display = semigroupSelected || setupHidden ? 'none' : '';
    semigroupInfo.style.display = semigroupSelected && !setupHidden ? '' : 'none';
  };
  setupToggleBtn.addEventListener('click', refreshRollTypeUI);
  rollTypeSelect.addEventListener('change', refreshRollTypeUI);
  refreshRollTypeUI();

  // Roll button
  const submitBtn = document.createElement('button');
  submitBtn.type = 'submit';
  submitBtn.textContent = 'Roll!';
  submitBtn.style.marginTop = '6px';
  submitBtn.style.width = '100%';
  quickSection.appendChild(submitBtn);

  formDiv.appendChild(form);
  document.body.appendChild(formDiv);

  if (sourceSelectionRequired) {
    const centeredLeft = Math.max(12, Math.round((window.innerWidth - formDiv.offsetWidth) / 2));
    const centeredTop = Math.max(12, Math.round((window.innerHeight - formDiv.offsetHeight) / 2));
    formDiv.style.left = `${centeredLeft}px`;
    formDiv.style.top = `${centeredTop}px`;
    formDiv.style.right = 'auto';
    formDiv.style.bottom = 'auto';
  }

  form.addEventListener('submit', e => {
    e.preventDefault();
    const rollType = document.getElementById('rollType').value;
    const semigroupSelected = rollType === 'semigroup';
    const selectedSource = sourceSelect.value;
    const mods = [];
    const saveData = selectedSource === 'save-file'
      ? toAugmentedSaveData(currentSaveData)
      : undefined;
    const roll20CharacterName = readCharacterName();

    if (!semigroupSelected && selectedSource === 'save-file' && !saveData) {
      showInputError(fileInput, 'Select a valid save JSON file');
      return;
    }

    if (!semigroupSelected) {
      const rows = Array.from(
        document.querySelectorAll('#staticModifiersContainer .static-modifier-row')
      );
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
    }

    const dropdownValue = document.getElementById('skillName').value.trim();
    const custom = document.getElementById('customSkillName');
    const skill = semigroupSelected
      ? ''
      :
      dropdownValue.toLowerCase() === 'other'
        ? custom.value.trim()
        : dropdownValue;

    rollSkillCheck({
      characterName: saveData?.characterName || roll20CharacterName,
      skillName: skill,
      customTitle: document.getElementById('customTitle').value.trim(),
      rollType,
      useLuck: document.getElementById('useluck').checked,
      advantage: document.getElementById('advantage').checked,
      staticModifiers: mods,
      ...(saveData ? { saveData } : {})
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
  Object.assign(row.style, {
    display: 'flex',
    gap: '4px',
    marginBottom: '4px',
    alignItems: 'center',
    width: '100%',
    boxSizing: 'border-box'
  });

  const nameInput = document.createElement('input');
  nameInput.className = 'mod-name';
  nameInput.placeholder = 'Name';
  nameInput.value = name;
  nameInput.style.flex = '1 1 0';
  nameInput.style.minWidth = '0';

  const valueInput = document.createElement('input');
  valueInput.className = 'mod-value';
  valueInput.type = 'text';
  valueInput.value = value;
  valueInput.style.flex = '0 1 84px';
  valueInput.style.minWidth = '64px';
  valueInput.style.width = 'auto';
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
  del.style.flex = '0 0 32px';
  del.style.width = '32px';
  del.style.padding = '2px 0';
  del.addEventListener('click', () => row.remove());

  row.append(nameInput, valueInput, del);
  container.appendChild(row);
}
