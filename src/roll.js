// src/roll.js
export function rollTechCheck({ characterName, skillName, customTitle, useLuck, advantage, staticModifiers }) {
  const generatedTitle = `${skillName} Check` +
    (useLuck ? " with Luck" : "") +
    (advantage ? " (Advantage)" : "");

  const rollDie = sides => Math.floor(Math.random() * sides) + 1;
  let chosenBase, chosenLuck = 0, chosenSum, advantageDetails = "";

  if (advantage) {
    const [b1, l1] = [rollDie(20), useLuck ? rollDie(4) : 0];
    const [b2, l2] = [rollDie(20), useLuck ? rollDie(4) : 0];
    const t1 = b1 + l1, t2 = b2 + l2;

    if (t1 >= t2) {
      chosenBase = b1; chosenLuck = l1; chosenSum = t1;
      advantageDetails = `Advantage: First combo used (Base: ${b1}, Luck: ${l1} = ${t1}; Other: ${b2} + ${l2} = ${t2})`;
    } else {
      chosenBase = b2; chosenLuck = l2; chosenSum = t2;
      advantageDetails = `Advantage: Second combo used (Base: ${b2}, Luck: ${l2} = ${t2}; Other: ${b1} + ${l1} = ${t1})`;
    }
  } else {
    chosenBase = rollDie(20);
    chosenLuck = useLuck ? rollDie(4) : 0;
    chosenSum = chosenBase + chosenLuck;
  }

  const staticSum = staticModifiers.reduce((sum, m) => sum + m.value, 0);

  const lines = [];
  if (customTitle) {
    lines.push(`{{name=${customTitle}}}`, `{{Roll=${generatedTitle}}}`);
  } else {
    lines.push(`{{name=${generatedTitle}}}`);
  }
  lines.push(`{{Base Roll=[[${chosenBase}]]}}`);
  if (useLuck) lines.push(`{{Luck=[[${chosenLuck}]]}}`);

  staticModifiers.forEach(m =>
    lines.push(`{{${m.name}=[[${m.value}]]}}`)
  );

  lines.push(`{{${skillName} Modifier=@{${characterName}|${skillName}}}}`);
  lines.push(`{{Total=[[${chosenSum} + @{${characterName}|${skillName}} + ${staticSum}]]}}`);
  if (advantage) lines.push(`{{Advantage Details=${advantageDetails}}}`);

  const msg = `&{template:default} ${lines.join('')}`;
  const chatInput = document.querySelector('#textchat-input textarea');
  chatInput.value = msg;
  chatInput.dispatchEvent(new Event('input', { bubbles: true }));
  chatInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
  document.querySelector('#chatSendBtn').click();
}
