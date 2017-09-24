import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const textToObject = (text = '') => {
  const str = text.replace('let data = \'', '').slice(0, -1).split('\\\'').join('\'');
  return JSON.parse(str);
};

const objectToText = (object) =>
  `let data = '${JSON.stringify(object).split('\'').join('\\\'')}'`;

const propertyPreset = {
  id: 'string',
  url: 'string',
  name: 'string',
  year: 'string',
  posterURL: 'string',
  color: 'string',
  w: 'number',
  h: 'number',
  director: 'object',
  yearError: 'boolean',
  posterError: 'boolean',
  directorError: 'boolean',
};

const checkProperty = (obj) => {
  const arr = Object.keys(propertyPreset);
  let flag = true;
  for (let i = 0, l = arr.length; i < l; i++) {
    if (arr[i] === 'director') {
      if (!_.isArray(obj[arr[i]])) {
        console.log(`${obj.name} 属性 ${arr[i]} 类型不正确`);
        flag = false;
      }
    }
    if (!Object.prototype.hasOwnProperty.call(obj, arr[i])) {
      console.log(`${obj.name} 缺少属性 ${arr[i]}`);
      flag = false;
    } else if (typeof obj[arr[i]] !== propertyPreset[arr[i]]) { // eslint-disable-line
      console.log(`${obj.name} 属性 ${arr[i]} 类型不正确`);
      flag = false;
    }
  }
  return flag;
};

const genOutput = () => {
  let flag = true;
  let emptyObjFlag = false;
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config.json'), 'utf8'));

  const fullOutputPath = path.join(__dirname, '..', '..', 'output', 'full_output.json');
  const outputPath = path.join(__dirname, '..', '..', 'output', 'output.json');
  if (!fs.existsSync(fullOutputPath)) return '';
  const res = [];

  const origin = textToObject(fs.readFileSync(fullOutputPath, 'utf8'));
  origin.forEach(val => {
    const _val = val;

    if (_.isEmpty(_val)) {
      emptyObjFlag = true;
      flag = false;
    }
    if (!_val.year || _val.yearError || _val.year === '') {
      res.push(`${_val.name} 年份信息出错  ${_val.url}`);
      flag = false;
    }
    if (!_val.director || _val.directorError || _val.director.length === 0) {
      res.push(`${_val.name} 导演信息出错  ${_val.url}`);
      flag = false;
    }

    flag = flag && checkProperty(_val);

    delete _val.id;
    delete _val.posterError;
    delete _val.yearError;
    delete _val.directorError;
    delete _val.url;
    delete _val.director;
  });

  if (config.outputAsJS) {
    fs.writeFileSync(outputPath, objectToText(origin), 'utf8');
  } else {
    fs.writeFileSync(outputPath, JSON.stringify(origin), 'utf8');
  }

  if (emptyObjFlag) {
    res.push('');
    res.push('存在空的条目');
  }
  if (flag) {
    return `没有发现异常，共 ${origin.length} 项`;
  }
  return res.join('\n');
};

export { textToObject, objectToText, genOutput };
