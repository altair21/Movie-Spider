import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { textToObject } from '../src/util/';

const filmPrototype = {
  name: '',
  year: '',
  collaborators: [],
};

const objPrototype = {
  name: '',
  films: [],
};

const processResult = (res) => {
  res.forEach((obj) => {
    const _obj = obj;
    _obj.films = _obj.films.sort((a, b) => {
      if (a.year === b.year) {
        return b.name < a.name;
      }
      return a.year - b.year;
    });
  });

  return res.sort((a, b) => {
    if (a.films.length === b.films.length) {
      return a.films[0].year - b.films[0].year;
    }
    return b.films.length - a.films.length;
  });
};

const getResult = () => {
  const outputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const origin = textToObject(fs.readFileSync(outputPath, 'utf8'));
  const res = [];

  origin.forEach((obj) => {
    obj.director.forEach((director) => {
      const findObj = _.find(res, (o) => o.name === director);

      const collas = [];
      for (let i = 0, l = obj.director.length || 0; i < l; i++) {
        if (obj.director[i] !== director) {
          collas.push(obj.director[i]);
        }
      }

      const item = {
        name: obj.name,
        year: +obj.year,
        collaborators: collas,
      };

      if (findObj) {
        findObj.films.push(item);
      } else {
        res.push({
          name: director,
          films: [item],
        });
      }
    });
  });

  return processResult(res);
};

const getStatisticsText = (res) => {
  const text = [];
  res.forEach((obj) => {
    text.push(`${obj.name}（${obj.films.length}部）`);

    obj.films.forEach((film) => {
      const filmName = film.name;
      const year = `（${film.year}年）`;
      const collas = film.collaborators.length > 0 ? `（与 ${film.collaborators.join('、')} 联合指导）` : '';
      text.push(`${filmName}${year}${collas}`);
    });
    text.push('');
  });

  return text.join('\n');
};

const genDirector = () => {
  const text = getStatisticsText(getResult());

  const filePath = process.argv[2] ? path.join(process.argv[2], 'directors.txt') : path.join(__dirname, '..', 'output', 'directors.txt');
  fs.writeFileSync(filePath, text, 'utf8');
};

genDirector();
