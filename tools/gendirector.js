import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir } from '../src/util/';

const filmPrototype = {
  name: '',
  year: '',
  collaborators: [],
  tag: '',
};

const objPrototype = {
  name: '',
  long: [],
  short: [],
  other: [],
  films: [],
};

const processResult = (res) => {
  const sortFunc = (a, b) => {
    if (a.year === b.year) {
      return b.name < a.name;
    }
    return a.year - b.year;
  };
  res.forEach((obj) => {
    const _obj = obj;
    _obj.long = _obj.long.sort(sortFunc);
    _obj.short = _obj.short.sort(sortFunc);
    _obj.other = _obj.other.sort(sortFunc);
  });

  return res.sort((a, b) => {
    if (a.long.length === b.long.length) {
      if (a.films.length === b.films.length) {
        return a.films[0].year - b.films[0].year;
      }
      return b.films.length - a.films.length;
    }
    return b.long.length - a.long.length;
  });
};

const getResult = () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
    .map(o => ({ ...o, director: o.director.map(d => d.name) }))
    .filter(o => o.classify === 'film');
  const res = [];

  origin.forEach((obj) => {
    (obj.director || []).forEach((director) => {
      const findObj = _.find(res, (o) => o.name === director);

      const collas = [];
      for (let i = 0, l = obj.director.length || 0; i < l; i++) {
        if (obj.director[i] !== director) {
          collas.push(obj.director[i]);
        }
      }

      let tag;
      if (_.indexOf(obj.category, '短片') !== -1) {
        tag = '短片';
      } else if (obj.classify === 'film') {
        tag = '长片';
      } else {
        tag = '其它';
      }

      const item = {
        ...filmPrototype,
        name: obj.multiName || obj.name,
        year: +obj.year,
        collaborators: collas,
        tag,
      };

      if (findObj) {
        if (item.tag === '长片') {
          findObj.long.push(item);
        } else if (item.tag === '短片') {
          findObj.short.push(item);
        } else {
          findObj.other.push(item);
        }
        findObj.films.push(item);
        findObj.origFormat.push(obj);
      } else {
        const newObj = {
          ...objPrototype,
          name: director,
          long: [],
          short: [],
          other: [],
          films: [],
          origFormat: [],
        };
        if (item.tag === '长片') {
          newObj.long.push(item);
        } else if (item.tag === '短片') {
          newObj.short.push(item);
        } else {
          newObj.other.push(item);
        }
        newObj.films.push(item);
        newObj.origFormat.push(obj);
        res.push(newObj);
      }
    });
  });

  return processResult(res);
};

const filmToLog = (logs) => (film) => {
  const filmName = film.name;
  const year = `（${film.year}年）`;
  const collas = film.collaborators.length > 0 ? `（与 ${film.collaborators.join('、')} 联合指导）` : '';
  logs.push(`[${film.tag}]${filmName}${year}${collas}`);
};

const getStatisticsText = (res) => {
  const text = [];
  const loopFunc = filmToLog(text);
  res.forEach((obj) => {
    const longText = obj.long.length === 0 ? '' : `，${obj.long.length}部长片`;
    const shortText = obj.short.length === 0 ? '' : `，${obj.short.length}部短片`;
    text.push(`${obj.name}（${obj.films.length}部${longText}${shortText}）`);

    obj.long.forEach(loopFunc);
    obj.short.forEach(loopFunc);
    obj.other.forEach(loopFunc);

    text.push('');
  });

  return text.join('\n');
};

const genDirector = () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const text = getStatisticsText(getResult());

  const filePath = process.argv[2] ? path.join(process.argv[2], 'directors.txt') : path.join(outputDir, 'directors.txt');
  fs.writeFileSync(filePath, text, 'utf8');
};

genDirector();

export { getResult as getDirectorResult };
