import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir } from '../src/util';

const numberOfWatched = 200000;
const maxNumberOfWatched = 300000;

const myOriginPath = path.join(__dirname, '..', 'output', 'full_output.json');
const ceOriginPath = path.join(__dirname, '..', 'output', 'full', 'luzhiyu-2018-03-25-full_output.json');

const outputDir = path.join(__dirname, '..', 'output', 'stat', 'nowatched');
const outputPath = path.join(outputDir, `${numberOfWatched}-nowatched.txt`);

const getLongest = (arr) => {
  const reg = new RegExp(/\d+/);
  return arr.reduce((res, val) => {
    if (reg.exec(val) == null) {
      console.log(arr);
    }
    const exec = reg.exec(val);
    const ret = exec ? exec[0] : 0;
    return Math.max(+res, +ret);
  }, 0);
};

(() => {
  mkdir(outputDir);
  const myOrigin = JSON.parse(fs.readFileSync(myOriginPath, 'utf8'));
  const data = JSON.parse(fs.readFileSync(ceOriginPath, 'utf8'))
  .filter(obj => !_.find(myOrigin, o => o.id === obj.id)
    && obj.numberOfWatched >= numberOfWatched
    && obj.numberOfWatched < maxNumberOfWatched
    // && obj.runtime
    && obj.classify === 'film')
  .sort((a, b) => {
    const al = getLongest(a.runtime);
    const bl = getLongest(b.runtime);
    if (a.score === b.score) {
      if (a.numberOfWatched === b.numberOfWatched) {
        return bl - al;
      }
      return b.numberOfWatched - a.numberOfWatched;
    }
    return b.score - a.score;
  })
  .map(obj => ({ ...obj, director: obj.director.map(d => d.name) }));

  const logs = [];
  data.forEach((obj, index) => {
    const str = `${index + 1}. 《${obj.name}》（${obj.director.join('、')}，${obj.year}）时长：${JSON.stringify(obj.runtime)} 评分：${obj.score}，人数：${obj.numberOfWatched}`;
    console.log(str);
    logs.push(str);
  });

  fs.writeFileSync(outputPath, logs.join('\n'), 'utf8');
})();
