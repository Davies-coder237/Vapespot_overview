import { readFileSync } from 'fs';
const file = process.argv[2];
const bundle = readFileSync(file, 'utf8');
console.log('taille brute:', (bundle.length / 1024).toFixed(1), 'KB');
const libs = ['recharts','date-fns','cmdk','embla','react-day-picker','lucide','zod','react-hook-form','radix','react','React','Router','route','scheduler','framer','sonner','vaul','input-otp','scroll-area','navigation-menu','accordion','tooltip','popover','tabs','pagination','ReactDOM','createRoot','query','QueryClient','useEffect','useState','useMemo','iframe','Telegram','storage','age'];
for (const l of libs) {
  const c = bundle.split(l).length - 1;
  if (c > 0) console.log((c + '').padStart(7), l.padEnd(22), (c * l.length * 1.2 / 1024).toFixed(1) + ' KB ~fit');
}
console.log('\n=== 400 premiers caracteres ===');
console.log(bundle.slice(0, 400));