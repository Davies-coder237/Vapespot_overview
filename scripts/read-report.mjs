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
const metas = data.nodeMetas;

// chaque meta uid -> {id, chunk -> partUid}
const byChunk = {};
for (const [muid, m] of Object.entries(metas)) {
  if (!m.moduleParts) continue;
  for (const [chunk, puid] of Object.entries(m.moduleParts)) {
    const p = parts[puid];
    if (!p) continue;
    const entry = { path: m.id || puid, raw: p.renderedLength || 0, gzip: p.gzipLength || 0 };
    byChunk[chunk] = byChunk[chunk] || [];
    byChunk[chunk].push(entry);
  }
}
for (const chunk of ['assets/index-q4xXyCtK.js']) {
  const entries = byChunk[chunk] || [];
  const totRaw = entries.reduce((s, e) => s + e.raw, 0);
  const totGz = entries.reduce((s, e) => s + e.gzip, 0);
  console.log('=== CHUNK', chunk, '===');
  console.log('total brut:', (totRaw / 1024).toFixed(1), 'KB | gzip:', (totGz / 1024).toFixed(1), 'KB');
  const agg = {};
  for (const e of entries) {
    const mm = e.path.match(/node_modules\/(@[^/]+\/[^/]+|[^/]+)/);
    const key = mm ? mm[1] : (e.path.split('/').pop() || e.path);
    agg[key] = agg[key] || { raw: 0, gzip: 0 };
    agg[key].raw += e.raw;
    agg[key].gzip += e.gzip;
  }
  console.log('\n-- Top par package (gzip) --');
  Object.entries(agg).sort((a, b) => b[1].gzip - a[1].gzip).slice(0, 40)
    .forEach(([k, v]) => console.log((v.gzip / 1024).toFixed(1).padStart(7) + ' KB gz  ' + (v.raw / 1024).toFixed(1).padStart(7) + ' KB  ' + k));
}