import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mkdir } from '../src/util/';

const presetWeights = [0, -3, -1, 2, 8, 40];
const shortPresetWeights = [0, -5, -3, 1, 5, 25];
const punishment = [100, 20, 15, 10, 5, 0];
const proportion = [0.8, 0.2];

const filmPrototype = {
  id: '',
  name: '',
  fromId: '',
  fromName: '',
  weight: 0,
};

const resPrototype = {
  id: '',
  name: '',
  weights: 0,
  normalizedWeights: 0,
  fromObj: [],
};

const fromObjPrototype = {
  id: '',
  name: '',
  userScore: 0,
};

const normalizeWeight = (_res, padding) => {
  let res = _.cloneDeep(_res);

  let minVal = Number.MAX_SAFE_INTEGER;
  let maxVal = Number.MIN_SAFE_INTEGER;
  let oMinVal = Number.MAX_SAFE_INTEGER;
  let oMaxVal = Number.MIN_SAFE_INTEGER;

  res.forEach((obj) => {
    obj.weights /= obj.fromObj.length; // eslint-disable-line no-param-reassign
    if (obj.fromObj.length < 5) {
      obj.weights -= punishment[obj.fromObj.length];  // eslint-disable-line no-param-reassign
    }
    if (obj.weights < minVal) minVal = obj.weights;
    if (obj.weights > maxVal) maxVal = obj.weights;
    if (obj.oldWeights < oMinVal) oMinVal = obj.oldWeights;
    if (obj.oldWeights > oMaxVal) oMaxVal = obj.oldWeights;
  });

  const range = maxVal - minVal + 2 * padding;
  const oRange = oMaxVal - oMinVal + 2 * padding;
  minVal -= padding;
  oMinVal -= padding;
  res = res.map(_obj => {
    const obj = _obj;
    const val = (obj.weights - minVal) / range * 100.0;
    const oVal = (obj.oldWeights - oMinVal) / oRange * 100.0;
    obj.avgVal = val * proportion[0] + oVal * proportion[1];
    obj.normalizedWeights = Number.parseFloat(obj.avgVal.toFixed(2), 10);
    return obj;
  }).sort((a, b) => b.avgVal - a.avgVal);
  return res;
};

const getStatisticsText = (res) => {
  const text = [];
  res.forEach((obj, index) => {
    const filmNames = obj.fromObj.map((o) => `《${o.name}》`);
    text.push(`${index + 1}. 《${obj.name}》 推荐度：${obj.normalizedWeights}% （根据你看过的 ${filmNames.join('、')} 评估）`);
  });
  return text.join('\n');
};

const doRecommand = () => {
  const outputDir = path.join(__dirname, '..', 'output', 'stat');
  mkdir(outputDir);
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8')).filter(o => !o.isManual);

  let films = [];
  let res = [];
  origin.forEach((obj) => {
    if (!obj.refFilms) return;
    films = films.concat(obj.refFilms.map(o =>
      ({
        ...filmPrototype,
        ...o,
        fromId: obj.id,
        fromName: obj.name,
        fromScore: obj.userScore,
        weight: _.indexOf(obj.category, '短片') === -1 ? presetWeights[obj.userScore] : shortPresetWeights[obj.userScore],
      })));
  });
  films.forEach((film) => {
    const findObj = _.find(res, (obj) => obj.id === film.id);
    if (findObj) {
      findObj.weights += film.weight;
      findObj.fromObj.push({ ...fromObjPrototype, id: film.fromId, name: film.fromName, userScore: film.fromScore });
    } else {
      res.push({
        ...resPrototype,
        id: film.id,
        name: film.name,
        weights: film.weight,
        fromObj: [{ fromObjPrototype, id: film.fromId, name: film.fromName, userScore: film.fromScore }],
      });
    }
  });

  res = res.filter((obj) => !_.find(origin, (o) => o.id === obj.id));  // 过滤标记过的影片
  res = res.map(_obj => {
    const obj = _obj;
    obj.fromObj = obj.fromObj.sort((a, b) => b.userScore - a.userScore);
    obj.oldWeights = obj.weights;
    return obj;
  });

  res = normalizeWeight(res, res.length / origin.length);

  const text = getStatisticsText(res);
  const outputPath = path.join(outputDir, 'recommand.txt');
  fs.writeFileSync(outputPath, text, 'utf8');
};

doRecommand();
