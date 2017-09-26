import { exec } from 'child_process';

const scp = (filePath, sshInfo) => new Promise((resolve, reject) => {
  if (!sshInfo || !sshInfo.host || !sshInfo.path) {
    reject(new Error(`服务器信息不正确 或 缺少所需字段：${JSON.stringify(sshInfo)}`));
    return;
  }
  const user = sshInfo.user || 'root';
  const host = sshInfo.host;
  const port = sshInfo.port || 22;
  const targetPath = sshInfo.path;
  const command = `scp -P ${port} ${filePath} ${user}@${host}:${targetPath}`;

  exec(command, { maxBuffer: 24 * 1024 * 1024 })
    .on('close', () => resolve(true))
    .on('error', err => reject(new Error(`scp 出错：${err}`)));
});

export { scp };
