import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir, openFilmOrigin } from '../src/util';

const outputDir = path.join(__dirname, '..', 'output', 'stat');
mkdir(outputDir);
const outputPath = path.join(outputDir, 'writers.txt');
const origin = openFilmOrigin(true).map(obj => ({
  ...obj,
  writer: obj.writer ? obj.writer.filter(w => w.id !== '') : [],
}));

const circleNumber = ['0', '①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩', '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳', '㉑', '㉒', '㉓', '㉔', '㉕', '㉖', '㉗', '㉘', '㉙', '㉚', '㉛', '㉜', '㉝', '㉞', '㉟', '㊱', '㊲', '㊳', '㊴', '㊵', '㊶', '㊷', '㊸', '㊹', '㊺', '㊻', '㊼', '㊽', '㊾', '㊿'];

const getWriterName = (writNames = []) => {
  const arr = [];
  writNames.forEach(name => {
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
    obj.writer.forEach((writ, index) => {
      const collas = [];
      for (let i = 0, l = obj.writer.length || 0; i < l; i++) {
        if (obj.writer[i].id !== writ.id) {
          collas.push(obj.writer[i].name);
        }
      }
      const newObj = {
        name: obj.name,
        year: obj.year,
        director: obj.director.join('、'),
        collaborators: collas,
        writIndex: index + 1,
      };

      const finded = _.find(data, o => o.id === writ.id);
      if (finded) {
        finded.name.push(writ.name);
        finded.films.push(newObj);
      } else {
        data.push({
          id: writ.id,
          name: [writ.name],
          films: [newObj],
        });
      }
    });
  });

  data.forEach(_obj => {
    const obj = _obj;
    obj.films = obj.films.sort((a, b) => a.year - b.year);
    obj.name = getWriterName(obj.name);
  });
  return data.sort((a, b) => b.films.length - a.films.length);
};

const getStatisticsText = (res) => {
  const logs = [];

  res.forEach(obj => {
    logs.push(`${obj.name} 共计 ${obj.films.length} 部影片：`);
    obj.films.forEach(film => {
      const collasLog = film.collaborators.length > 0 ? `与 ${film.collaborators.join('、')} 联合编剧` : '';
      logs.push(`${circleNumber.length > film.writIndex ? circleNumber[film.writIndex] : film.writIndex}《${film.name}》（${film.director}，${film.year}）${collasLog}`);
    });
    logs.push('');
  });

  return logs.join('\n');
};

const genWriter = () => {
  const text = getStatisticsText(getResult());

  fs.writeFileSync(outputPath, text, 'utf8');
};

genWriter();
