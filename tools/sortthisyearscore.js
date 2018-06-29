import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir } from '../src/util';

const year = `${(new Date()).getFullYear()}`;

const isThisYearDomestic = (obj) => {
  const reg = new RegExp(`${year}-\\d{2}-\\d{2}`, 'u');
  for (let i = 0, l = obj.releaseDate.length; i < l; i++) {
    if (reg.test(obj.releaseDate[i])
      && obj.releaseDate[i].indexOf('中国大陆') !== -1
      && obj.releaseDate[i].indexOf('重映') === -1
      && year - obj.year <= 5) {
      if (obj.country.indexOf('中国大陆') !== -1
        || obj.country.indexOf('香港') !== -1
        || obj.country.indexOf('澳门') !== -1
        || obj.country.indexOf('台湾') !== -1) {
        return true;
      }
      break;
    }
  }
  return false;
};

const isThisYearIntroduced = (obj) => {
  const reg = new RegExp(`${year}-\\d{2}-\\d{2}`, 'u');
  for (let i = 0, l = obj.releaseDate.length; i < l; i++) {
    if (reg.test(obj.releaseDate[i])
      && obj.releaseDate[i].indexOf('中国大陆') !== -1
      && obj.releaseDate[i].indexOf('重映') === -1
      && year - obj.year <= 5) {
      if (obj.country.indexOf('中国大陆') === -1
        && obj.country.indexOf('香港') === -1
        && obj.country.indexOf('澳门') === -1
        && obj.country.indexOf('台湾') === -1) {
        return true;
      }
      break;
    }
  }
  return false;
};

const isThisYearNonCinema = (obj) => {
  if (!isThisYearDomestic(obj) && !isThisYearIntroduced(obj)
    && obj.markDate && obj.markDate.startsWith(year)
    && (obj.year === year || +obj.year + 1 === +year)
    && !_.find(obj.category, (c) => c.indexOf('短片') !== -1)
    && !_.find(obj.releaseDate, (r) => r.indexOf('中国大陆') !== -1)) {
    return true;
  }
  return false;
};

const isThisYearFilm = (obj) =>
  isThisYearDomestic(obj) || isThisYearIntroduced(obj) || isThisYearNonCinema(obj);

const extractScore = (obj) => {
  const idx1 = obj.userComment.lastIndexOf('【');
  const idx2 = obj.userComment.lastIndexOf('】');
  let val;
  if (idx1 < 0 || idx2 < 0) {
    val = 0;
  } else {
    const valStr = obj.userComment.substring(idx1 + 1, idx2);
    val = Number.parseFloat(valStr, 10);
  }
  return val;
};

(async () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const outPath = path.join(outputDir, 'sortThisYearScore.txt');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
    .filter(o => !o.isManual && !_.find(o.category, c => c === '短片') && o.classify === 'film')
    .map(o => ({ ...o, director: o.director.map(d => d.name) }));

  let res = origin.filter((obj) => isThisYearFilm(obj));
  res = res.sort((a, b) => {
    const aScore = extractScore(a);
    const bScore = extractScore(b);
    return bScore - aScore;
  }).map(obj => ({
    ...obj,
    logStr: `《${obj.name}》 导演：${obj.director.join('、')}【${extractScore(obj)}】`,
  }));

  const text = [];
  text.push(`### ${year} 年的院线华语片`);
  res.filter(isThisYearDomestic)
    .forEach((obj, index) => text.push(`${index + 1}. ${obj.logStr}`));
  text.push('');

  text.push(`### ${year} 年的院线引进片`);
  res.filter(isThisYearIntroduced)
    .forEach((obj, index) => text.push(`${index + 1}. ${obj.logStr}`));
  text.push('');

  text.push(`### ${year} 年的非院线片`);
  res.filter(isThisYearNonCinema)
    .forEach((obj, index) => text.push(`${index + 1}. ${obj.logStr}`));
  text.push('');

  fs.writeFileSync(outPath, text.join('\n'), 'utf8');
})();
