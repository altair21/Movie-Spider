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
  id: '',
  name: [],
  long: [],
  short: [],
  teleplay: [],
  other: [],
  all: [],
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
    _obj.teleplay = _obj.teleplay.sort(sortFunc);
  });

  return res.sort((a, b) => {
    if (a.long.length === b.long.length) {
      if (a.all.length === b.all.length) {
        return a.all[0].year - b.all[0].year;
      }
      return b.all.length - a.all.length;
    }
    return b.long.length - a.long.length;
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
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
    .filter(o => !o.isManual && !_.find(o.category, c => c === '真人秀' || c === '脱口秀'))
    .map(obj => ({
      ...obj,
      director: obj.director ? obj.director.filter(d => d.id !== '') : [],
    }));
  const res = [];

  origin.forEach((obj) => {
    (obj.director || []).forEach((director) => {
      const findObj = _.find(res, (o) => o.id === director.id);

      const collas = [];
      for (let i = 0, l = obj.director.length || 0; i < l; i++) {
        if (obj.director[i].id !== director.id) {
          collas.push(obj.director[i].name);
        }
      }

      let tag;
      if (obj.classify === 'film') {
        if (_.indexOf(obj.category, '短片') !== -1) {
          tag = '短片';
        } else {
          tag = '长片';
        }
      } else if (obj.classify === 'teleplay') {
        tag = '电视剧';
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
        } else if (item.tag === '电视剧') {
          findObj.teleplay.push(item);
        } else {
          findObj.other.push(item);
        }
        findObj.all.push(item);
        findObj.origFormat.push(obj);
        findObj.name.push(director.name);
      } else {
        const newObj = {
          ...objPrototype,
          id: director.id,
          name: [director.name],
          long: [],
          short: [],
          teleplay: [],
          other: [],
          all: [],
          origFormat: [],
        };
        if (item.tag === '长片') {
          newObj.long.push(item);
        } else if (item.tag === '短片') {
          newObj.short.push(item);
        } else if (item.tag === '电视剧') {
          newObj.teleplay.push(item);
        } else {
          newObj.other.push(item);
        }
        newObj.all.push(item);
        newObj.origFormat.push(obj);
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
  logs.push(`[${film.tag}]${filmName}${year}${collas}`);
};

const getStatisticsText = (res) => {
  const text = [];
  const loopFunc = filmToLog(text);
  res.forEach((obj) => {
    const longText = obj.long.length === 0 ? '' : `，${obj.long.length}部长片`;
    const shortText = obj.short.length === 0 ? '' : `，${obj.short.length}部短片`;
    const teleplayText = obj.teleplay.length === 0 ? '' : `, ${obj.teleplay.length}部电视剧`;
    text.push(`${obj.name}（${obj.all.length}部${longText}${shortText}${teleplayText}）`);

    obj.long.forEach(loopFunc);
    obj.short.forEach(loopFunc);
    obj.teleplay.forEach(loopFunc);
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
