import fs from 'fs';

export const mkdir = (pathName) => { // mkdir recursive
  let separator;
  if (process.platform === 'win32') {
    separator = '\\';
  } else {
    separator = '/';
  }
  pathName.split(separator).reduce((p, folder) => {
    const fp = p + folder + separator;
    if (!fs.existsSync(fp)) {
      fs.mkdirSync(fp);
    }
    return fp;
  }, '');
};
