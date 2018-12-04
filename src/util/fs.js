import fs from 'fs';
import path from 'path';
import _ from 'lodash';

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

export const openFilmOrigin = (retainShort = false, filterFunc = () => true) => {
  const fullOutputPath = path.join(__dirname, '..', '..', 'output', 'full_output.json');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
  .filter(o => !o.isManual && !_.find(o.category, c => c === '真人秀' || c === '脱口秀') && o.classify === 'film')
  .filter(o => (retainShort ? true : !_.find(o.category, c => c === '短片')))
  .filter(filterFunc)
  .map(o => ({ ...o, director: o.director.map(d => d.name) }));
  return origin;
};
