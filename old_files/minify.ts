const fs = require('fs');
const JSON5 = require('json5');

const input = '';
const parsed = JSON5.parse(input);
const output = JSON5.stringify(parsed, { space: 0 });

// Zapis do pliku
fs.writeFileSync('output.json5', output);
console.log('Minified JSON5 zapisany.');
