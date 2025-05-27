const fs = require('fs');

let code = fs.readFileSync('./dist/bookmarklet.js', 'utf8').trim();

// Remove "use strict" and compress whitespace
code = code.replace(/^"use strict";/, '').replace(/\s+/g, ' ').replace(/;$/, '');

// Wrap with javascript: and IIFE safety
const bookmarklet = `javascript:${code}`;

// Save clean output
fs.writeFileSync('./dist/bookmarklet.txt', bookmarklet);
console.log('✅ Bookmarklet generated in dist/bookmarklet.txt');
