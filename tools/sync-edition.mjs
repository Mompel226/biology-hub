/* Carry the shared files from this edition (NLCS) to the open one.
       node tools/sync-edition.mjs            # copy, then report what changed
       node tools/sync-edition.mjs --check    # report only, change nothing

   The two editions differ by ONE file, js/local.js: here it adds the school's
   own doors and renames the site; there it is a stub. Everything else — the
   page, the stylesheet, the engine, the shared register, the door images — is
   copied verbatim, so a fix made once reaches both.

   Not copied: js/local.js, README.md, version.txt, .claude/, and the door
   images belonging to a local door. The open edition is stamped by its own
   tools/stamp.mjs and committed in its own repository.                       */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = resolve(HERE, '..');
const TO   = resolve(FROM, '../igcse-biology-hub');
const CHECK = process.argv.includes('--check');

if (!existsSync(TO)) {
  console.error('The open edition is not beside this one:\n  ' + TO +
    '\nClone Mompel226/igcse-biology-hub there first.');
  process.exit(1);
}

/* images that belong to a door defined in js/local.js, not to the shared register */
const LOCAL_DOORS = (readFileSync(resolve(FROM, 'js/local.js'), 'utf8')
  .match(/id:'([a-z0-9-]+)'/g) || []).map(m => m.slice(4, -1));

const FILES = ['index.html', 'css/hub.css', 'js/hub.js', 'js/shelves.js',
               'tools/stamp.mjs', '.nojekyll', '.gitignore',
               /* the marks system: every school that uses a lab needs it */
               'apps-script/Code.gs', 'apps-script/ClassroomImport.html', 'tools/gastest.js'];
for (const f of readdirSync(resolve(FROM, 'assets/doors'))) {
  if (LOCAL_DOORS.some(id => f.startsWith(id + '-'))) continue;
  FILES.push('assets/doors/' + f);
}

/* Each edition carries its own cache stamp, so ?v=<n> is not drift: normalise it
   away before comparing, or --check would report index.html every single time and
   stop being worth reading. */
const norm = b => Buffer.from(String(b).replace(/\?v=\d+/g, '?v='));
const sum = b => createHash('sha256').update(norm(b)).digest('hex').slice(0, 12);
let changed = 0, same = 0;

for (const rel of FILES) {
  const src = resolve(FROM, rel), dst = resolve(TO, rel);
  if (!existsSync(src)) { console.error('missing here: ' + rel); process.exitCode = 1; continue; }
  let body = readFileSync(src);
  /* CREDITS.md carries a row per door; drop the rows for local doors */
  if (rel.endsWith('CREDITS.md')) {
    body = Buffer.from(String(body).split('\n')
      .filter(l => !LOCAL_DOORS.some(id => l.toLowerCase().includes('`' + id + '-*`')))
      .join('\n'));
  }
  const before = existsSync(dst) ? readFileSync(dst) : null;
  if (before && sum(before) === sum(body)) { same++; continue; }
  changed++;
  console.log((CHECK ? 'differs  ' : 'copied   ') + rel +
    (before ? '  ' + sum(before) + ' → ' + sum(body) : '  (new)'));
  if (!CHECK) { mkdirSync(dirname(dst), { recursive: true }); writeFileSync(dst, body); }
}

/* files that must exist over there but are never overwritten */
for (const rel of ['js/local.js', 'README.md']) {
  if (!existsSync(resolve(TO, rel))) { console.error('the open edition is missing ' + rel); process.exitCode = 1; }
}

console.log(`\n${changed} ${CHECK ? 'differ' : 'copied'}, ${same} already identical.`);
if (!CHECK && changed) console.log('Now: cd ../igcse-biology-hub && node tools/stamp.mjs && git add -A && git commit && git push');
