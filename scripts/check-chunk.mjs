import { readFileSync } from 'fs';
const f = 'dist/assets/index-q4xXyCtK.js';
const b = readFileSync(f, 'utf8');
const probes = {
  'react-query (queryFn/useQuery)': 'queryFn',         // marqueur @tanstack/react-query
  'QueryClient': 'QueryClient',
  'query-core': 'setIsPending',
  'schema-data (gold-plat)': 'gold',                    // marqueurs JSON découvrables
  'listings.json ("shopAddress")': 'shopAddress',
  '__ROOT/listing names': '"latitude"',
  'sonner': 'sonner',
  'lucide': 'lucide-react',
  'preload hero (Hero-mobile)': 'Hero-mobile',
  'aspect-ratio class': 'aspect-',
};
for (const [k, p] of Object.entries(probes)) {
  const c = b.split(p).length - 1;
  console.log((c + '').padStart(6), k.padEnd(32), '->', c, 'ocurr.');
}
// marqueurs react-query
for (const p of ['staleTime','gcTime','refetchOnWindowFocus','queryKeyHashFn','notifyManager','isServer','defaultQueryOptions','hydration','PersistQueryClient','onlineManager','focusManager']) {
  const c = b.split(p).length - 1;
  if (c > 0) console.log('   ', c, '->', p);
}
console.log('\ntaille fichier:', (b.length / 1024).toFixed(0), 'KB');