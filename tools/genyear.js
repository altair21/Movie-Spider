import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir, openFilmOrigin } from '../src/util/';

const filmPrototype = {
  name: '',
  director: [],
};

const objPrototype = {
  year: '',
  films: [],
};

const processResult = (res) => {
  res.forEach((obj) => {
    const _obj = obj;
    _obj.films = _obj.films.sort((a, b) => b.name < a.name);
  });

  return res.sort((a, b) => (+b.year) - (+a.year));
};

const getResult = () => {
  const origin = openFilmOrigin(true);
  const res = [];

  origin.forEach((obj) => {
    const findObj = _.find(res, (o) => o.year === obj.year);

    const item = {
      ...filmPrototype,
      name: obj.name,
      director: obj.director,
    };

    if (findObj) {
      findObj.films.push(item);
    } else {
      res.push({
        ...objPrototype,
        year: obj.year,
        films: [item],
      });
    }
  });

  return processResult(res);
};

const getStatisticsText = (res) => {
  const text = [];
  res.forEach((obj) => {
    text.push(`${obj.year} 年（${obj.films.length}部）`);

    obj.films.forEach((film) => {
      const filmName = film.name;
      const director = film.director ? `（${film.director.join('、')} 执导）` : '';
      text.push(`${filmName}${director}`);
    });
    text.push('');
  });

  return text.join('\n');
};

const genYear = () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const text = getStatisticsText(getResult());

  const filePath = process.argv[2] ? path.join(process.argv[2], 'years.txt') : path.join(outputDir, 'years.txt');
  fs.writeFileSync(filePath, text, 'utf8');
};

genYear();
