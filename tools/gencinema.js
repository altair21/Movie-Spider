import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir } from '../src/util/';

const year = (new Date()).getFullYear();

const sortFun = (key) => (a, b) => {
  const month = (str) => str.substr(5, 2);
  const day = (str) => str.substr(8, 2);
  if (month(a[key]) === month(b[key])) {
    return day(a[key]) - day(b[key]);
  }
  return month(a[key]) - month(b[key]);
};

(async () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const outputPath = path.join(outputDir, 'cinemafilm.txt');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
    .filter(o => !o.isManual && o.releaseDate && o.releaseDate.length > 0)
    .map(o => ({ ...o, director: o.director.map(d => d.name) }));
  const domestic = [];  // 国产片
  const introduced = [];  // 引进片
  const nonCinema = []; // 非院线片

  origin.forEach((obj) => {
    // 下面这个正则不起作用，不知何故
    // const reg = new RegExp(`${year}-\\d{2}-\\d{2}(\\u4e2d\\u56fd\\u5927\\u9646)`, 'u');
    const reg = new RegExp(`${year}-\\d{2}-\\d{2}`, 'u');
    for (let i = 0, l = obj.releaseDate.length; i < l; i++) {
      if (reg.test(obj.releaseDate[i])
        && obj.releaseDate[i].indexOf('中国大陆') !== -1) {
        const newObj = {
          ...obj,
          releaseDate: obj.releaseDate[i].substr(0, 10),
        };
        if (obj.country.indexOf('中国大陆') !== -1) {
          domestic.push(newObj);
        } else {
          introduced.push(newObj);
        }
        break;
      }
    }
  });
  origin.forEach((obj) => {
    if (!_.find(domestic, (o) => o.id === obj.id)
      && !_.find(introduced, (o) => o.id === obj.id)
      && obj.markDate && obj.markDate.startsWith(year)
      && (obj.year === year || +obj.year + 1 === +year)
      && !_.find(obj.releaseDate, (r) => r.indexOf('中国大陆') !== -1)) {
      nonCinema.push(obj);
    }
  });

  const text = [];
  text.push(`${year} 年的院线片`);
  text.push(`国产片共 ${domestic.length} 部：`);
  domestic.sort(sortFun('releaseDate')).forEach(obj => text.push(`《${obj.name}》 上映时间：${obj.releaseDate} 导演：${obj.director.join('、')} 标记日期：${obj.markDate}`));
  text.push('');

  text.push(`引进片共 ${introduced.length} 部：`);
  introduced.sort(sortFun('releaseDate')).forEach(obj => text.push(`《${obj.name}》 上映时间：${obj.releaseDate} 导演：${obj.director.join('、')} 标记日期：${obj.markDate}`));
  text.push('');

  text.push(`推测的非院线片共 ${nonCinema.length} 部：`);
  nonCinema.sort(sortFun('markDate')).forEach(obj => text.push(`《${obj.name}》(${obj.year}) 导演：${obj.director.join('、')} 标记日期：${obj.markDate}`));

  fs.writeFileSync(outputPath, text.join('\n'), 'utf8');
})();
