const fs = require('node:fs');
const path = require('node:path');
const source = path.resolve(__dirname, '../../allexi_backend/shared');
const target = path.resolve(__dirname, '../shared');
function files(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const name = path.join(prefix, entry.name);
    return entry.isDirectory() ? files(path.join(dir, entry.name), name) : [name];
  }).sort();
}
if (process.argv.includes('--check')) {
  const names = files(source);
  if (JSON.stringify(names) !== JSON.stringify(files(target)) || names.some(name => !fs.readFileSync(path.join(source, name)).equals(fs.readFileSync(path.join(target, name))))) {
    console.error('Shared definitions differ. Run npm run sync:shared in allexi_mobile.');
    process.exitCode = 1;
  } else console.log('Shared definitions match.');
} else {
  fs.cpSync(source, target, { recursive: true });
  console.log('Updated the mobile app’s bundled shared definitions from the backend.');
}
