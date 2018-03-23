import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const PropertyType = {
  STRING: 'STRING',
  NUMBER: 'NUMBER',
  OBJECT: 'OBJECT',
  ARRAY: 'ARRAY',
  BOOLEAN: 'BOOLEAN',
};

/**
 * 预设属性值
 * - name*: 属性名
 * - type*: 属性值的类型
 * - allowNull: 属性是否可以为空 (default: false)
 * - retainForOutput: 最后生成 `output.json` 时属性是否保留 (default: false)
 * - allowEmptyArray: 属性是否可以为空数组（仅当属性是数组类型时有效）(default: false)
 * - allowEmptyString: 属性是否可以为空字符串（仅当属性是字符串类型时有效）(default: false)
*/
const PropertyPreset = [
  // --------------- Rough Info ---------------
  // 影片 id （唯一）
  {
    name: 'id',
    type: PropertyType.STRING,
    allowNull: false,
  },
  // 影片 url（唯一）
  {
    name: 'url',
    type: PropertyType.STRING,
    allowNull: false,
  },
  // 短名称
  {
    name: 'name',
    type: PropertyType.STRING,
    allowNull: false,
    retainForOutput: true,
  },
  // 海报 url
  {
    name: 'posterURL',
    type: PropertyType.STRING,
    allowNull: false,
    retainForOutput: true,
  },
  // 海报主导色
  {
    name: 'color',
    type: PropertyType.STRING,
    allowNull: false,
    retainForOutput: true,
  },
  // 海报宽度
  {
    name: 'w',
    type: PropertyType.NUMBER,
    allowNull: false,
    retainForOutput: true,
  },
  // 海报高度
  {
    name: 'h',
    type: PropertyType.NUMBER,
    allowNull: false,
    retainForOutput: true,
  },
  // 用户打的标签
  {
    name: 'tags',
    type: PropertyType.ARRAY,
    allowNull: false,
    allowEmptyArray: true,
  },
  // 用户评分
  {
    name: 'userScore',
    type: PropertyType.NUMBER,
    allowNull: false,
  },
  // 用户短评
  {
    name: 'userComment',
    type: PropertyType.STRING,
    allowNull: false,
    allowEmptyString: true,
  },
  // 短评被赞数
  {
    name: 'commentLikes',
    type: PropertyType.NUMBER,
    allowNull: false,
  },
  // 用户标记日期
  {
    name: 'markDate',
    type: PropertyType.STRING,
    allowNull: false,
  },
  // 长名称，`/`分隔
  {
    name: 'multiName',
    type: PropertyType.STRING,
    allowNull: false,
  },

  // --------------- Detail Info ---------------
  // 年份
  {
    name: 'year',
    type: PropertyType.STRING,
    allowNull: false,
    retainForOutput: true,
  },
  // 导演
  {
    name: 'director',
    type: PropertyType.ARRAY,
    allowNull: false,
  },
  // 演员
  {
    name: 'actor',
    type: PropertyType.ARRAY,
    allowNull: false,
    allowEmptyArray: true,
  },
  // 类别
  {
    name: 'category',
    type: PropertyType.ARRAY,
    allowNull: false,
  },
  // 制片国家/地区
  {
    name: 'country',
    type: PropertyType.ARRAY,
    allowNull: false,
  },
  // 上映日期
  {
    name: 'releaseDate',
    type: PropertyType.ARRAY,
    allowNull: true,
    allowEmptyArray: true,
  },
  // 片长
  {
    name: 'runtime',
    type: PropertyType.ARRAY,
    allowNull: false,
    allowEmptyArray: true,
  },
  // 类别
  {
    name: 'classify',
    type: PropertyType.STRING,
    allowNull: false,
  },
  // 豆瓣评分
  {
    name: 'score',
    type: PropertyType.NUMBER,
    allowNull: false,
  },
  // 评分人数
  {
    name: 'numberOfScore',
    type: PropertyType.NUMBER,
    allowNull: false,
  },
  // 看过的人数
  {
    name: 'numberOfWatched',
    type: PropertyType.NUMBER,
    allowNull: false,
  },
  // 想看的人数
  {
    name: 'numberOfWanted',
    type: PropertyType.NUMBER,
    allowNull: false,
  },
  // 友邻评分
  {
    name: 'friendsScore',
    type: PropertyType.NUMBER,
    allowNull: false,
  },
  // 友邻评分人数
  {
    name: 'friendsNoS',
    type: PropertyType.NUMBER,
    allowNull: false,
  },
  // 相关影片
  {
    name: 'refFilms',
    type: PropertyType.ARRAY,
    allowNull: true,
    allowEmptyArray: true,
  },
  {
    name: 'awards',
    type: PropertyType.ARRAY,
    allowNull: true,
    allowEmptyArray: true,
  },

  // --------------- Detail Info Validator ---------------
  {
    name: 'posterError',
    type: PropertyType.BOOLEAN,
  },
  {
    name: 'yearError',
    type: PropertyType.BOOLEAN,
  },
  {
    name: 'directorError',
    type: PropertyType.BOOLEAN,
  },
  {
    name: 'categoryError',
    type: PropertyType.BOOLEAN,
  },
  {
    name: 'scoreError',
    type: PropertyType.BOOLEAN,
  },
  {
    name: 'numberOfScoreError',
    type: PropertyType.BOOLEAN,
  },
  {
    name: 'refFilmsError',
    type: PropertyType.BOOLEAN,
  },
];


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

const checkProperty = (obj) => {
  if (obj.isManual) {
    return { isCorrect: true, errorMessages: [] };
  }
  const errorMessages = [];
  // 推测
  if (obj.yearError && obj.directorError && obj.categoryError
    && obj.scoreError && obj.numberOfScoreError) {
    errorMessages.push(`${obj.name}(${obj.url}) 有很大可能404了`);
    return { isCorrect: errorMessages.length === 0, errorMessages };
  }

  for (let i = 0, l = PropertyPreset.length; i < l; i++) {
    if (!_.isNull(obj[PropertyPreset[i].name])) {
      const pn = PropertyPreset[i].name;
      const property = obj[pn];
      switch (PropertyPreset[i].type) {
        case PropertyType.ARRAY:
          if (_.isArray(property)) {
            if (!PropertyPreset[i].allowEmptyArray && property.length === 0) {
              errorMessages.push(`${obj.name} 属性 ${pn} 值为空数组`);
            }
          } else if (!PropertyPreset[i].allowNull) {
            errorMessages.push(`${obj.name} 属性 ${pn} 值类型不正确`);
          }
          break;
        case PropertyType.BOOLEAN:
          if (_.isBoolean(property)) {
            if (property === true) {
              errorMessages.push(`${obj.name} 属性 ${pn} 为 true`);
            }
          } else if (!PropertyPreset[i].allowNull) {
            errorMessages.push(`${obj.name} 属性 ${pn} 值类型不正确`);
          }
          break;
        case PropertyType.STRING:
          if (_.isString(property)) {
            if (property.indexOf('�') !== -1) {
              errorMessages.push(`${obj.name} 属性 ${pn} 包含未识别的字符`);
            }
            if (property.indexOf('\n') !== -1) {
              errorMessages.push(`${obj.name} 属性 ${pn} 包含换行符`);
            }
            if (!PropertyPreset[i].allowEmptyString && property === '') {
              errorMessages.push(`${obj.name} 属性 ${pn} 值为空字符串`);
            }
          } else if (!PropertyPreset[i].allowNull) {
            errorMessages.push(`${obj.name} 属性 ${pn} 值类型不正确`);
          }
          break;
        case PropertyType.NUMBER:
          if (!_.isNumber(property)) {
            errorMessages.push(`${obj.name} 属性 ${pn} 类型不正确`);
          }
          break;
        case PropertyType.OBJECT:
          if (!_.isObject(property)) {
            errorMessages.push(`${obj.name} 属性 ${pn} 类型不正确`);
          }
          break;
        default:
          errorMessages.push('未知错误');
      }
    } else if (!PropertyPreset[i].allowNull) {
      errorMessages.push(`${obj.name} 缺少属性 ${PropertyPreset[i].name}`);
    }
  }
  return { isCorrect: errorMessages.length === 0, errorMessages };
};

export {
  textToObject, textPathToObject, objectToText, objectToTextPath,
  objectToJSONPath, checkProperty, JSONPathToObject, PropertyPreset,
};
