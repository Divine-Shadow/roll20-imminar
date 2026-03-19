const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function runCommand(command, args, input) {
  try {
    cp.execFileSync(command, args, {
      input,
      stdio: ['pipe', 'ignore', 'ignore']
    });
    return true;
  } catch {
    return false;
  }
}

function copyToClipboard(value) {
  if (process.platform === 'darwin') {
    return runCommand('pbcopy', [], value);
  }

  if (process.platform === 'win32') {
    return runCommand('clip', [], value);
  }

  return (
    runCommand('xclip', ['-selection', 'clipboard'], value) ||
    runCommand('xsel', ['--clipboard', '--input'], value) ||
    runCommand('wl-copy', [], value)
  );
}

function openFile(targetPath) {
  if (process.platform === 'darwin') {
    return runCommand('open', [targetPath]);
  }

  if (process.platform === 'win32') {
    return runCommand('cmd', ['/c', 'start', '', targetPath]);
  }

  return runCommand('xdg-open', [targetPath]);
}

function escapeHtml(input) {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildInstallPage(bookmarklet, outputPath) {
  const escaped = escapeHtml(bookmarklet);
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Roll20 Imminar Bookmarklet</title>
  <style>
    :root {
      color-scheme: light dark;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
    }
    body {
      margin: 0;
      padding: 24px;
      background: #f4f4f6;
      color: #111;
    }
    .card {
      max-width: 760px;
      margin: 0 auto;
      border: 1px solid #d4d7dc;
      border-radius: 12px;
      background: #fff;
      padding: 20px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.06);
    }
    h1 { margin-top: 0; }
    .actions {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin: 16px 0;
    }
    .btn {
      display: inline-block;
      text-decoration: none;
      border: 1px solid #3b3f47;
      border-radius: 8px;
      padding: 10px 14px;
      color: #fff;
      background: #2c2f36;
      font-weight: 600;
      cursor: pointer;
    }
    .btn.secondary {
      color: #2c2f36;
      background: #fff;
      border-color: #9aa3b2;
    }
    .muted { color: #555; }
    .code {
      margin-top: 12px;
      border-radius: 8px;
      border: 1px solid #d4d7dc;
      padding: 10px;
      background: #f8f9fb;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      white-space: pre-wrap;
      word-break: break-all;
      max-height: 180px;
      overflow: auto;
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>Install Roll20 Imminar Bookmarklet</h1>
    <p class="muted">Drag the button to your bookmarks bar, or copy the bookmarklet URL.</p>

    <div class="actions">
      <a class="btn" href="${escaped}" draggable="true">Roll20 Imminar</a>
      <button class="btn secondary" id="copyBtn" type="button">Copy Bookmarklet URL</button>
    </div>

    <ol>
      <li>Show your browser bookmarks bar.</li>
      <li>Drag <strong>Roll20 Imminar</strong> onto the bookmarks bar.</li>
      <li>Open Roll20 and click the bookmark.</li>
    </ol>

    <details>
      <summary>Manual copy fallback</summary>
      <div class="code" id="bookmarkletCode">${escaped}</div>
    </details>
  </div>

  <script>
    const code = ${JSON.stringify(bookmarklet)};
    document.getElementById('copyBtn').addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code);
        const btn = document.getElementById('copyBtn');
        const old = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => { btn.textContent = old; }, 1200);
      } catch {
        alert('Clipboard access failed. Copy from the Manual copy fallback section.');
      }
    });
  </script>
</body>
</html>
`;

  fs.writeFileSync(outputPath, html);
}

const args = new Set(process.argv.slice(2));
const shouldCopy = args.has('--copy');
const shouldOpen = args.has('--open');
const outputDir = path.resolve('./dist');
const bookmarkletJsPath = path.join(outputDir, 'bookmarklet.js');
const bookmarkletTxtPath = path.join(outputDir, 'bookmarklet.txt');
const installPagePath = path.join(outputDir, 'install.html');

if (!fs.existsSync(bookmarkletJsPath)) {
  console.error('❌ dist/bookmarklet.js not found. Run `npm run build` first.');
  process.exit(1);
}

let code = fs.readFileSync(bookmarkletJsPath, 'utf8').trim();

// Remove "use strict" and compress whitespace
code = code.replace(/^"use strict";/, '').replace(/\s+/g, ' ').replace(/;$/, '');

const bookmarklet = `javascript:${code}`;

fs.writeFileSync(bookmarkletTxtPath, bookmarklet);
buildInstallPage(bookmarklet, installPagePath);

console.log('✅ Bookmarklet generated in dist/bookmarklet.txt');
console.log('✅ Installer page generated in dist/install.html');

if (shouldCopy) {
  if (copyToClipboard(bookmarklet)) {
    console.log('✅ Bookmarklet copied to clipboard');
  } else {
    console.log('⚠️ Clipboard copy unavailable on this system. Copy from dist/bookmarklet.txt');
  }
}

if (shouldOpen) {
  if (openFile(installPagePath)) {
    console.log('✅ Opened dist/install.html');
  } else {
    console.log('⚠️ Could not open browser automatically. Open dist/install.html manually.');
  }
}
