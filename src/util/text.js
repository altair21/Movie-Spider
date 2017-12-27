import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const propertyPreset = {
  // roughInfo
  id: 'string',                   // 影片 id  （唯一）
  url: 'string',                  // 影片 url （唯一）
  name: 'string',                 // 短名称
  posterURL: 'string',            // 海报 url
  color: 'string',                // 海报主导色
  w: 'number',                    // 海报宽度
  h: 'number',                    // 海报高度
  tags: 'object',                 // 用户打的标签
  userScore: 'number',            // 用户评分
  userComment: 'string',          // 用户短评
  commentLikes: 'number',         // 短评被赞数
  markDate: 'string',             // 用户标记日期
  multiName: 'string',            // 长名称，`/` 分隔

  // detailInfo
  year: 'string',                 // 年份
  director: 'object',             // 导演
  category: 'object',             // 类别
  score: 'number',                // 豆瓣评分
  numberOfScore: 'number',        // 评分人数
  refFilms: 'object',             // 相关影片

  // detailInfo validator
  posterError: 'boolean',         // 海报信息是否获取成功
  yearError: 'boolean',           // 年份信息是否获取成功
  directorError: 'boolean',
  categoryError: 'boolean',
  scoreError: 'boolean',
  numberOfScoreError: 'boolean',
  refFilmsError: 'boolean',
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
  if (obj.isManual) {
    return { isCorrect: true, errorMessages: [] };
  }
  const arr = Object.keys(propertyPreset);
  const errorMessages = [];
  let flag = true;
  for (let i = 0, l = arr.length; i < l; i++) {
    if (config.ignoreTags && arr[i] === 'tags') {
      continue; // eslint-disable-line no-continue
    }
    if (obj.isManual) continue; // eslint-disable-line
    if (!Object.prototype.hasOwnProperty.call(obj, arr[i]) || obj[arr[i]] === undefined) {
      errorMessages.push(`${obj.name} 缺少属性 ${arr[i]}`);
      flag = false;
    } else if (typeof obj[arr[i]] !== propertyPreset[arr[i]]) { // eslint-disable-line
      errorMessages.push(`${obj.name} 属性 ${arr[i]} 类型不正确`);
      flag = false;
    } else if (arr[i] === 'director' || arr[i] === 'tags' || arr[i] === 'category' || arr[i] === 'refFilms') {  // 应是数组类型的属性
      if (!_.isArray(obj[arr[i]])) {
        errorMessages.push(`${obj.name} 属性 ${arr[i]} 类型不正确`);
        flag = false;
      } else if (obj[arr[i]].length === 0) {
        errorMessages.push(`${obj.name} 属性 ${arr[i]} 值为空数组`);
        flag = false;
      }
    }
    if (typeof obj[arr[i]] === 'string') {
      if (obj[arr[i]] === '' && arr[i] !== 'userComment') { // 用户短评可以为空
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
    if (propertyPreset[arr[i]] === 'boolean' && obj[arr[i]]) {
      errorMessages.push(`${obj.name} 属性 ${arr[i]} 为 true`);
      flag = false;
    }
    if (((arr[i] === 'w' || arr[i] === 'h') && obj[arr[i]] === 0)) {
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
    if (!_val.score || _val.scoreError) {
      res.push(`${_val.name} 评分信息出错 ${_val.url}`);
      flag = false;
    }
    if (!_val.numberOfScore || _val.numberOfScoreError) {
      res.push(`${_val.name} 评分人数出错 ${_val.url}`);
      flag = false;
    }
    if (!_val.category || _val.categoryError || _val.category.length === 0) {
      res.push(`${_val.name} 类别信息出错 ${_val.url}`);
      flag = false;
    }
    if (!_val.refFilms || _val.refFilmsError || _val.refFilms.length === 0) {
      res.push(`${_val.name} 相关推荐影片出错 ${_val.url}`);
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
    delete _val.userScore;
    delete _val.userComment;
    delete _val.commentLikes;
    delete _val.markDate;
    delete _val.score;
    delete _val.numberOfScore;
    delete _val.category;
    delete _val.refFilms;
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
