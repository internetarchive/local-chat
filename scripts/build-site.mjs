// Assembles a self-contained, static-hosting-ready copy of the docs/demo page,
// plus the distribution module it loads -- everything needed to serve the
// page, with none of the repo-only files (source, tests, internal ADRs) that
// don't belong on a public web server. Run via `npm run build:site`.

import { existsSync, mkdirSync, readFileSync, rmSync, cpSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const outDir = join(root, 'site')
const distModule = join(root, 'dist', 'local-chat.js')

if (!existsSync(distModule)) {
  console.error(`Missing ${distModule} — run \`npm run build\` first (or use \`npm run build:site\`, which does this for you).`)
  process.exit(1)
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })

// The built ESM module, placed at the site root so index.html's rewritten
// script tag (./local-chat.js, see below) can reach it.
cpSync(distModule, join(outDir, 'local-chat.js'))

// index.html loads the module via a dev-only path (/src/index.ts) that only
// Vite's dev server knows how to serve -- rewritten to the built module
// instead.
const html = readFileSync(join(root, 'index.html'), 'utf8')
const rewritten = html.replace('src="/src/index.ts"', 'src="./local-chat.js"')
if (rewritten === html) {
  console.error('Expected to rewrite a script src in index.html but found nothing to replace.')
  process.exit(1)
}
writeFileSync(join(outDir, 'index.html'), rewritten)

console.log(`Wrote a self-contained site to ${outDir}:`)
console.log('  index.html')
console.log('  local-chat.js')
console.log('\nCopy the contents of site/ to any static web server.')
