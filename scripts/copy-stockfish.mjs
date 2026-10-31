// Copia los binarios WebAssembly de Stockfish desde node_modules a public/engine
// para que Vite los sirva como archivos estáticos (los Web Workers se cargan por URL).
import { existsSync, mkdirSync, readdirSync, copyFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const pkgDir = join(root, 'node_modules', 'stockfish');
const srcDir = existsSync(join(pkgDir, 'bin')) ? join(pkgDir, 'bin') : join(pkgDir, 'src');
const outDir = join(root, 'public', 'engine');

if (!existsSync(srcDir)) {
  console.warn('[copy-stockfish] No se encontró el paquete stockfish; omitiendo.');
  process.exit(0);
}
mkdirSync(outDir, { recursive: true });

const files = readdirSync(srcDir).filter((f) => /\.(js|wasm)$/.test(f));
const copied = [];
for (const f of files) {
  // Copiamos solo las variantes "lite" (red NNUE pequeña, ~7 MB) para no inflar la app.
  // La variante single-thread funciona en cualquier navegador; la multihilo requiere
  // cabeceras COOP/COEP (configuradas en vite.config.ts).
  if (!/lite/.test(f)) continue;
  copyFileSync(join(srcDir, f), join(outDir, f));
  copied.push(f);
}

const pick = (re) => copied.find((f) => re.test(f) && f.endsWith('.js'));
const manifest = {
  single: pick(/lite-single/),
  multi: pick(/lite(?!-single)/),
  files: copied,
};
writeFileSync(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
console.log('[copy-stockfish] Copiados:', copied.join(', '));
console.log('[copy-stockfish] Manifest:', manifest);

