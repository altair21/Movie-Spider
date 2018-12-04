import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir, openFilmOrigin } from '../src/util';

const outputDir = path.join(__dirname, '..', 'output', 'stat');
mkdir(outputDir);
const outputPath = path.join(outputDir, 'actors.txt');
const origin = openFilmOrigin(true).map(obj => ({
  ...obj,
  actor: obj.actor ? obj.actor.filter(d => d.id !== '') : [],
}));

const circleNumber = ['0', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳', '㉑', '㉒', '㉓', '㉔', '㉕', '㉖', '㉗', '㉘', '㉙', '㉚', '㉛', '㉜', '㉝', '㉞', '㉟', '㊱', '㊲', '㊳', '㊴', '㊵', '㊶', '㊷', '㊸', '㊹', '㊺', '㊻', '㊼', '㊽', '㊾', '㊿'];

const getActorName = (actNames = []) => {
  const arr = [];
  actNames.forEach(name => {
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
  const data = [];

  origin.forEach((obj) => {
    obj.actor.forEach((act, index) => {
      const newObj = {
        name: obj.name,
        year: obj.year,
        director: obj.director.join('、'),
        actIndex: index + 1,
      };
      const finded = _.find(data, o => o.id === act.id);
      if (finded) {
        finded.name.push(act.name);
        finded.films.push(newObj);
      } else {
        data.push({
          id: act.id,
          name: [act.name],
          films: [newObj],
        });
      }
    });
  });

  data.forEach(_obj => {
    const obj = _obj;
    obj.films = obj.films.sort((a, b) => a.year - b.year);
    obj.name = getActorName(obj.name);
  });
  return data.sort((a, b) => b.films.length - a.films.length);
};

const getStatisticsText = (res) => {
  const logs = [];

  res.forEach(obj => {
    logs.push(`${obj.name} 共计 ${obj.films.length} 部影片：`);
    obj.films.forEach(film => {
      logs.push(`${circleNumber.length > film.actIndex ? circleNumber[film.actIndex] : film.actIndex}《${film.name}》（${film.director}，${film.year}）`);
    });
    logs.push('');
  });

  return logs.join('\n');
};

const genActor = () => {
  const text = getStatisticsText(getResult());

  fs.writeFileSync(outputPath, text, 'utf8');
};

genActor();
