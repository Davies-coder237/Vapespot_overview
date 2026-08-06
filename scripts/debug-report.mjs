import { readFileSync } from 'fs';
const html = readFileSync('dist-analyze/bundle-report.html', 'utf8');
const start = html.indexOf('const data = ') + 'const data = '.length;
let depth = 0, inStr = false, esc = false, end = -1;
for (let k = start; k < html.length; k++) {
  const ch = html[k];
  if (esc) { esc = false; continue; }
  if (ch === '\\' && inStr) { esc = true; continue; }
  if (ch === '"') { inStr = !inStr; continue; }
  if (inStr) continue;
  if (ch === '{') depth++;
  else if (ch === '}') { depth--; if (depth === 0) { end = k + 1; break; } }
}
const data = JSON.parse(html.slice(start, end));
const parts = data.nodeParts;
console.log('parts keys count:', Object.keys(parts).length);
const pk = Object.keys(parts)[0];
console.log('part[0]:', JSON.stringify(parts[pk]).slice(0, 400));
console.log('part[1]:', JSON.stringify(parts[Object.keys(parts)[1]]).slice(0, 400));
// cherche "size" dans tout le JSON
const full = JSON.stringify(data);
let i = full.indexOf('"size"');
console.log('premier "size" à:', i, '| contexte:', full.slice(Math.max(0,i-80), i+120));
// liste quelques clés de nodeParts contenant node_modules
const nmKeys = Object.keys(parts).filter(k => String(parts[k]).includes('node_modules')).slice(0, 3);
for (const k of nmKeys) console.log('nm part:', JSON.stringify(parts[k]).slice(0, 300));