import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const propertyPreset = {
  id: 'string',
  url: 'string',
  name: 'string',
  year: 'string',
  posterURL: 'string',
  color: 'string',
  w: 'number',
  h: 'number',
  tags: 'object',
  director: 'object',
  multiName: 'string',
  yearError: 'boolean',
  posterError: 'boolean',
  directorError: 'boolean',
};

const mkdirForFilePath = (filePath) => {
  path.dirname(filePath).split(path.sep).reduce((parentDir, childDir) => {
    const curDir = path.resolve(parentDir, childDir);
    if (!fs.existsSync(curDir)) {
      fs.mkdirSync(curDir);
    }
    return curDir;
  }, path.isAbsolute(path.dirname(filePath)) ? path.sep : '');
};

const textToObject = (text = '') => {
  const str = text.replace('let data = \'', '').slice(0, -1).split('\\\'').join('\'');
  return JSON.parse(str);
};

const textPathToObject = (filePath = '') => {
  if (fs.existsSync(filePath)) {
    const text = fs.readFileSync(filePath, 'utf8');
    return textToObject(text);
  }
  return [];
};

const JSONPathToObject = (filePath = '') => {
  if (fs.existsSync(filePath)) {
    const text = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(text);
  }
  return [];
};

const objectToText = (object) =>
  `let data = '${JSON.stringify(object).split('\'').join('\\\'')}'`;

const objectToTextPath = (object, filePath) => {
  mkdirForFilePath(filePath);
  fs.writeFileSync(filePath, objectToText(object), 'utf8');
};

const objectToJSONPath = (object, filePath) => {
  mkdirForFilePath(filePath);
  fs.writeFileSync(filePath, JSON.stringify(object), 'utf8');
};

const checkProperty = (obj, config) => {
  const arr = Object.keys(propertyPreset);
  const errorMessages = [];
  let flag = true;
  for (let i = 0, l = arr.length; i < l; i++) {
    if (config.ignoreTags && arr[i] === 'tags') {
      continue; // eslint-disable-line no-continue
    }
    if (obj.isManual) continue; // eslint-disable-line
    if (!Object.prototype.hasOwnProperty.call(obj, arr[i])) {
      errorMessages.push(`${obj.name} 缺少属性 ${arr[i]}`);
      flag = false;
    } else if (typeof obj[arr[i]] !== propertyPreset[arr[i]]) { // eslint-disable-line
      errorMessages.push(`${obj.name} 属性 ${arr[i]} 类型不正确`);
      flag = false;
    } else if (arr[i] === 'director' || arr[i] === 'tags') {
      if (!_.isArray(obj[arr[i]])) {
        errorMessages.push(`${obj.name} 属性 ${arr[i]} 类型不正确`);
        flag = false;
      } else if (obj[arr[i]].length === 0) {
        errorMessages.push(`${obj.name} 属性 ${arr[i]} 值为空数组`);
        flag = false;
      }
    }
    if (typeof obj[arr[i]] === 'string') {
      if (obj[arr[i]] === '') {
        errorMessages.push(`${obj.name} 属性 ${arr[i]} 值为空字符串`);
        flag = false;
      } else if (obj[arr[i]].indexOf('\n') !== -1) {
        errorMessages.push(`${obj.name} 属性 ${arr[i]} 包含换行符`);
        flag = false;
      }
      if (obj[arr[i]].indexOf('�') !== -1) {
        errorMessages.push(`${obj.name} 属性 ${arr[i]} 包含不识别的字符`);
        flag = false;
      }
    }
    if (((arr[i] === 'w' || arr[i] === 'h') && obj[arr[i]] === 0)
      || (arr[i] === 'color' && obj[arr[i]] === 'white')) {
      errorMessages.push(`${obj.name} 海报解析不正确`);
    }
  }
  return { isCorrect: flag, errorMessages };
};

const genOutput = () => {
  let flag = true;
  let emptyObjFlag = false;
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'config.json'), 'utf8'));

  const fullOutputPath = path.join(__dirname, '..', '..', 'output', 'full_output.json');
  const outputPath = path.join(__dirname, '..', '..', 'output', 'output.json');
  if (!fs.existsSync(fullOutputPath)) return '';
  let res = [];

  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));
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

    const checked = checkProperty(_val, config);
    res = res.concat(checked.errorMessages);
    flag = flag && checked.isCorrect;

    delete _val.id;
    delete _val.multiName;
    delete _val.posterError;
    delete _val.yearError;
    delete _val.directorError;
    delete _val.url;
    delete _val.director;
    delete _val.tags;
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

export {
  textToObject, textPathToObject, objectToText, genOutput, objectToTextPath,
  objectToJSONPath, propertyPreset, checkProperty, JSONPathToObject,
};
