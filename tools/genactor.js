import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir } from '../src/util';

const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
const outputDir = path.join(__dirname, '..', 'output', 'stat');
mkdir(outputDir);
const outputPath = path.join(outputDir, 'actors.txt');
const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
  .filter(obj => obj.classify === 'film')
  .map(obj => ({
    ...obj,
    director: obj.director.map(d => d.name),
    actor: obj.actor ? obj.actor.filter(d => d.id !== '') : [],
  }));

const getResult = () => {
  const data = [];

  origin.forEach((obj) => {
    const newObj = {
      name: obj.name,
      year: obj.year,
      director: obj.director.join('、'),
    };

    obj.actor.forEach(act => {
      const finded = _.find(data, o => o.id === act.id);
      if (finded) {
        finded.films.push(newObj);
      } else {
        data.push({
          id: act.id,
          name: act.name,
          films: [newObj],
        });
      }
    });
  });

  data.forEach(_obj => {
    const obj = _obj;
    obj.films = obj.films.sort((a, b) => a.year - b.year);
  });
  return data.sort((a, b) => b.films.length - a.films.length);
};

const getStatisticsText = (res) => {
  const logs = [];

  res.forEach(obj => {
    logs.push(`${obj.name} 共计 ${obj.films.length} 部影片：`);
    obj.films.forEach(film => {
      logs.push(`《${film.name}》（${film.director}，${film.year}）`);
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
