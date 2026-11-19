// Builds the Chrome Web Store / Edge Add-ons upload ZIP: only the files the extension runs, in a fixed
// order with fixed timestamps, so the same source always gives the same bytes. Usage: node build.mjs
import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const RUNTIME = ['manifest.json', 'popup.html', 'popup.css', 'popup.mjs', 'clipper.mjs', 'LICENSE'];
const FOLDERS = ['_locales', 'icons'];

async function filesUnder(folder) {
  const out = [];
  for (const entry of await readdir(path.join(root, folder), { withFileTypes: true })) {
    const relative = folder + '/' + entry.name;
    if (entry.isDirectory()) out.push(...await filesUnder(relative));
    else if (entry.isFile() && !entry.name.startsWith('.')) out.push(relative);
  }
  return out;
}

/** Every path the manifest names, so a missing icon or popup fails here and not in store review. */
export function manifestPaths(manifest) {
  return [manifest.action.default_popup, ...Object.values(manifest.icons), ...Object.values(manifest.action.default_icon)];
}

export async function packageFiles() {
  const files = [...RUNTIME];
  for (const folder of FOLDERS) files.push(...await filesUnder(folder));
  return files.sort();
}

async function main() {
  const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
  const files = await packageFiles();
  for (const needed of manifestPaths(manifest)) if (!files.includes(needed)) throw new Error('MISSING ' + needed);
  for (const file of files) if ((await stat(path.join(root, file))).size > 1024 * 1024) throw new Error('TOO_LARGE ' + file);
  const dist = path.join(root, 'dist');
  await mkdir(dist, { recursive: true });
  const name = `habitude-note-clipper-${manifest.version}.zip`;
  execFileSync('python3', ['-c', 'import zipfile,pathlib,sys\nroot=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],"w",zipfile.ZIP_DEFLATED) as z:\n for n in sys.argv[3:]:\n  x=zipfile.ZipInfo(n,(2026,1,1,0,0,0));x.external_attr=0o644<<16;x.compress_type=zipfile.ZIP_DEFLATED;z.writestr(x,(root/n).read_bytes())', root, path.join(dist, name), ...files]);
  const bytes = await readFile(path.join(dist, name));
  const report = { name, version: manifest.version, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), files };
  await writeFile(path.join(dist, 'artifacts.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report) + '\n');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { process.stderr.write('CLIPPER_BUILD_FAILED ' + error.message + '\n'); process.exitCode = 1; });
}
