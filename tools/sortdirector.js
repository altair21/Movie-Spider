import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir } from '../src/util/';
import { openFilmOrigin } from '../src/util/fs';

const filmPrototype = {
  name: '',
  year: '',
  collaborators: [],
  score: 0,
};

const objPrototype = {
  id: '',
  name: [],
  films: [],
  totalScore: 0,
  scoreCount: 0,  // 计算平均分时忽略未打分的影片
};

const processResult = (res) => {
  const sortFunc = (a, b) => {
    if (a.score === b.score) {
      return b.year < a.year;
    }
    return b.score - a.score;
  };
  res.forEach((obj) => {
    const _obj = obj;
    _obj.films = _obj.films.sort(sortFunc);
  });

  return res.sort((a, b) => {
    if (a.scoreCount === 0) return 1;
    if (b.scoreCount === 0) return -1;
    const aScore = a.totalScore / a.scoreCount;
    const bScore = b.totalScore / b.scoreCount;
    if (aScore === bScore) {
      if (a.films.length === b.films.length) {
        return a.films[0].year - b.films[0].year;
      }
      return b.films.length - a.films.length;
    }
    return bScore - aScore;
  });
};

const getDirectorName = (dirNames = []) => {
  const arr = [];
  dirNames.forEach(name => {
    const findObj = _.find(arr, o => o.name === name);
    if (findObj) {
      findObj.count++;
    } else {
      arr.push({
        name,
        count: 1,
      });
    }
  });
  const res = arr.sort((a, b) => a.length - b.length).map(o => o.name);
  return `${res.join(' / ')}`;
};

const getResult = () => {
  const origin = openFilmOrigin(true, false, (o) => o.director);
  const res = [];

  origin.forEach((obj) => {
    obj.director.forEach((director) => {
      const findObj = _.find(res, (o) => o.id === director.id);
      const collas = [];
      for (let i = 0, l = obj.director.length || 0; i < l; i++) {
        if (obj.director[i].id !== director.id) {
          collas.push(obj.director[i].name);
        }
      }
      const item = {
        ...filmPrototype,
        name: obj.multiName || obj.name,
        year: +obj.year,
        collaborators: collas,
        score: +obj.userScore,
      };
      if (findObj) {
        findObj.films.push(item);
        findObj.name.push(director.name);
        if (obj.userScore > 0) {
          findObj.totalScore += obj.userScore;
          findObj.scoreCount++;
        }
      } else {
        const newObj = {
          ...objPrototype,
          id: director.id,
          name: [director.name],
          films: [item],
          totalScore: obj.userScore > 0 ? obj.userScore : 0,
          scoreCount: obj.userScore > 0 ? 1 : 0,
        };
        res.push(newObj);
      }
    });
  });
  res.forEach(obj => {
    obj.name = getDirectorName(obj.name); // eslint-disable-line no-param-reassign
  });

  return processResult(res);
};

const filmToLog = (logs) => (film) => {
  const filmName = film.name;
  const year = `（${film.year}年）`;
  const collas = film.collaborators.length > 0 ? `（与 ${film.collaborators.join('、')} 联合指导）` : '';
  const score = film.score > 0 ? (() => {
    let scoreStr = '';
    for (let i = 0, l = film.score; i < l; i++) {
      scoreStr += '⭐️';
    }
    return scoreStr;
  })() : '未打分';
  logs.push(`[${score}]${filmName}${year}${collas}`);
};

const getStatisticsText = (res) => {
  const text = [];
  const loopFunc = filmToLog(text);
  res.forEach((obj) => {
    text.push(`${obj.name}（${obj.scoreCount > 0 ? `${(obj.totalScore / obj.scoreCount).toFixed(2)}⭐️` : '没有打分的影片'}）`);
    obj.films.forEach(loopFunc);
    text.push('');
  });
  return text.join('\n');
};

const sortDirector = () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const text = getStatisticsText(getResult());

  const filePath = process.argv[2] ? path.join(process.argv[2], 'sortdirectors.txt') : path.join(outputDir, 'sortdirectors.txt');
  fs.writeFileSync(filePath, text, 'utf8');
};

sortDirector();

export { getResult as getSortDirectorResult };
