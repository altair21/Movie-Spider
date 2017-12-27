import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const presetWeights = [0, -3, -1, 2, 4, 7];

const filmPrototype = {
  id: '',
  name: '',
  posterURL: '',
  fromId: '',
  fromName: '',
  weight: 0,
};

const resPrototype = {
  id: '',
  name: '',
  posterURL: '',
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
  res = res.sort((a, b) => b.weights - a.weights);

  let minVal = Number.MAX_SAFE_INTEGER;
  let maxVal = Number.MIN_SAFE_INTEGER;
  res.forEach((obj) => {
    if (obj.weights < minVal) minVal = obj.weights;
    if (obj.weights > maxVal) maxVal = obj.weights;
  });

  const range = maxVal - minVal + 2 * padding;
  minVal -= padding;
  res.forEach((obj) => {
    const val = (obj.weights - minVal) / range * 100.0;
    obj.normalizedWeights = Number.parseFloat(val.toFixed(2), 10);  // eslint-disable-line no-param-reassign
  });
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
        weight: presetWeights[obj.userScore],
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
        posterURL: film.posterURL,
        weights: film.weight,
        fromObj: [{ fromObjPrototype, id: film.fromId, name: film.fromName, userScore: film.fromScore }],
      });
    }
  });

  res = res.filter((obj) => !_.find(origin, (o) => o.id === obj.id));  // 过滤标记过的影片
  res.forEach((obj) => {
    obj.fromObj = obj.fromObj.sort((a, b) => b.userScore - a.userScore);  // eslint-disable-line no-param-reassign
  });

  res = normalizeWeight(res, res.length / origin.length);

  const text = getStatisticsText(res);
  const outputPath = path.join(__dirname, '..', 'output', 'recommand.txt');
  fs.writeFileSync(outputPath, text, 'utf8');
};

doRecommand();
