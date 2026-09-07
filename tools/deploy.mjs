/* Deploy BOTH editions in one command.      node tools/deploy.mjs

   The only weakness of keeping the NLCS and open editions in two repositories
   is that they can drift apart if someone edits a shared file and forgets to
   carry it across. So don't rely on remembering: this stamps this edition,
   syncs every shared file to the open one, stamps that too, and prints the two
   commits to make. Deploying without syncing now takes more effort than
   deploying properly.

   tools/stamp.mjs stays a single-purpose file because it is itself shared with
   the open edition; this one is not synced and lives only here.              */
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const FROM = resolve(HERE, '..');
const TO   = resolve(FROM, '../igcse-biology-hub');
const run  = (file, args, cwd) => execFileSync(file, args, { cwd, stdio: 'inherit' });

if (!existsSync(TO)) {
  console.error('The open edition is not beside this one:\n  ' + TO);
  process.exit(1);
}

console.log('\n— NLCS edition —');
run('node', ['tools/stamp.mjs'], FROM);

console.log('\n— carrying the shared files across —');
run('node', ['tools/sync-edition.mjs'], FROM);

console.log('\n— open edition —');
run('node', ['tools/stamp.mjs'], TO);

const dirty = d => execFileSync('git', ['status', '--porcelain'], { cwd: d }).toString().trim();
console.log('\n— what is left to do —');
for (const [name, dir] of [['biology-hub (NLCS)', FROM], ['igcse-biology-hub (open)', TO]]) {
  const d = dirty(dir);
  console.log(`\n  ${name}: ` + (d ? d.split('\n').length + ' file(s) changed' : 'nothing changed'));
  if (d) console.log(`    cd "${dir}" && git add -A && git commit && git push`);
}
console.log('\nBoth stamped from the same shared files. `node tools/sync-edition.mjs --check`');
console.log('should now say 0 differ; if it does not, something copied wrong.\n');
