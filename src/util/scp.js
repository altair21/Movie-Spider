import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config.json'), 'utf8'));

const scp = origFile => new Promise((resolve, reject) => {
  if (!config.ssh || !config.ssh.host || !config.ssh.path) {
    resolve(false);
    return;
  }
  const user = config.ssh.user || 'root';
  const host = config.ssh.host;
  const port = config.ssh.port || 22;
  const targetPath = config.ssh.path;
  const command = `scp -P ${port} ${origFile} ${user}@${host}:${targetPath}`;

  exec(command, { maxBuffer: 24 * 1024 * 1024 })
    .on('close', () => resolve(true))
    .on('error', err => reject(new Error(`scp出错：${err.message}`)));
});

export { scp };
