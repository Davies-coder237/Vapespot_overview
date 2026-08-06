import { readFileSync, readdirSync } from 'fs';
const dir = 'dist/assets';
const probes = {
  'schema-data (vaporiser/en-AU mark)': '"vaporiser"',
  'listings.json (latitude)': '"latitude"',
  'listings.json (streetAddress)': '"streetAddress"',
  'hero preload': 'Hero-mobile.webp',
};
for (const f of readdirSync(dir)) {
  if (!f.endsWith('.js')) continue;
  const b = readFileSync(dir + '/' + f, 'utf8');
  const sizeKB = (b.length / 1024).toFixed(0);
  let hits = [];
  for (const [k, p] of Object.entries(probes)) {
    const c = b.split(p).length - 1;
    if (c > 0) hits.push(k + ' x' + c);
  }
  if (hits.length) console.log(f.padEnd(28), sizeKB.padStart(5) + 'KB  ', hits.join(' | '));
}