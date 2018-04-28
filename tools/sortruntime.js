import fs from 'fs';
import path from 'path';

import { mkdir } from '../src/util';

const getCorrectRuntime = (obj) => {
  if (obj.runtime.length === 0) return 0;
  const _obj = obj;
  const reg = new RegExp(/\d+/);
  const val = obj.runtime[0];
  const exec = reg.exec(val);
  if (exec == null) {
    delete _obj.awards;
    delete _obj.refFilms;
    console.error(obj);
    return 0;
  }
  return exec[0];
};

(async () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const outPath = path.join(outputDir, 'sortRuntime.txt');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
    .filter(o => !o.isManual)
    .map(o => ({ ...o, director: o.director.map(d => d.name) }));

  const text = origin
    .map(obj => {
      obj.runtime = obj.runtime.filter(v => v.indexOf('中国大陆') === -1 || obj.runtime.length === 1); // eslint-disable-line no-param-reassign
      return obj;
    })
    .sort((a, b) => getCorrectRuntime(b) - getCorrectRuntime(a))
    .map((obj, index) => `${index + 1}. 《${obj.name}》（${obj.director.join('、')} 执导，${obj.year}） ${obj.runtime[0]}`)
    .reduce((arr, msg) => {
      arr.push(msg);
      return arr;
    }, []);

  fs.writeFileSync(outPath, text.join('\n'), 'utf8');
})();
