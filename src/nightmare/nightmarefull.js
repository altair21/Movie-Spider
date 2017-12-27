/* global document */
import fs from 'fs';
import path from 'path';
import Nightmare from 'nightmare';
import cheerio from 'cheerio';
import _ from 'lodash';

import { checkProperty, getPosterInfo, getTodayDate } from '../util/';
import { analyze } from './nightmarecommon';
import { getRoughInfos } from '../basehelper';

const targetId = 4513116;

const fullOutputPath = path.join(__dirname, '..', '..', 'output', 'full_output.json');
const configPath = path.join(__dirname, '..', '..', 'config.json');
const ruleoutPath = path.join(__dirname, '..', '..', 'output', 'filter.json');
const ruleoutItems = fs.existsSync(ruleoutPath) ? JSON.parse(fs.readFileSync(ruleoutPath, 'utf8')) : [];
const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const nightmareConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'nightmare-config.json'), 'utf8'));
let res = [];
console.log(origin.length);

const extractFilmName = async (content) => {
  const $ = cheerio.load(content);
  const avaiIndex = [];

  const resObj = await getRoughInfos(content).reduce((promise, obj) =>
    promise.then(async (arr) => {
      try {
        const imgInfo = await getPosterInfo(obj.posterURL);
        return arr.concat([{ ...obj, w: imgInfo.width || 0, h: imgInfo.height || 0, color: imgInfo.color || 'white', posterError: false }]);
      } catch (e) {
        const findObj = _.find(origin, (o) => o.id === obj.id);
        if (findObj) {
          return { ...obj, w: findObj.w || 0, h: findObj.h || 0, color: findObj.color || 'white', posterError: findObj.posterError };
        }
        return { ...obj };
      }
    }), Promise.resolve([]));

  const tags = $('#content .article .grid-view .item .info span.tags');
  tags.each((index, element) => {
    const text = $(element).text();
    if (config.keywords && config.keywords.length > 0) {
      let flag = false;
      for (let i = 0, l = config.keywords.length; i < l; i++) {
        if (text.indexOf(config.keywords[i]) !== -1) {
          flag = true;
          break;
        }
      }
      if (flag) avaiIndex.push(index);
    } else {
      avaiIndex.push(index);
    }
  });

  res = res.concat(resObj.filter(
    obj => _.find((obj.tags || []),
      (tag) => _.find((config.keywords || []),
        (keyword) => keyword === tag)))); // 过滤关键字之外的内容
  return !!$('.next a')[0];
  // if (!config.keywords || config.keywords.length < 1 || tags.length === 0 || avaiIndex.length === 0) {
  //   res = res.concat(resObj);
  //   return !!$('.next a')[0];
  // }

  // const ret = [];
  // for (let i = 0, l = avaiIndex.length; i < l; i++) {
  //   ret.push(resObj[avaiIndex[i]]);
  // }
  // res = res.concat(ret);
  // return !!$('.next a')[0];
};

const writeResult = (newOrigin) => {
  fs.writeFileSync(fullOutputPath, JSON.stringify(newOrigin), 'utf8');
  return 0;
};

const initialize = () => {
  res = [];
};

const analyzeAll = async (nightmare) => {
  const arr = _.range(res.length);
  console.log(arr.length);
  const allMessages = [];

  // TODO: 输出新增影片
  // const newItems = [];
  const newOrigin = await arr.reduce((promise, index) =>
    promise.then(async (ret) => {
      if (res[index].isManual) {
        return ret.concat([res[index]]);
      }
      const findIndex = _.findIndex(origin, (o) => o.id === res[index].id);
      const newAnalyzed = await analyze(nightmare, `https://movie.douban.com${res[index].url}`, findIndex !== -1 ? origin[findIndex] : res[index]);
      const newInfo = newAnalyzed.resInfo;
      if (findIndex !== -1 && newAnalyzed.messages.length !== 0) {
        console.log(newAnalyzed.messages.join('\n'));
        allMessages.concat(newAnalyzed.messages);
      }

      const checked = checkProperty(newInfo, config);
      if (checked.errorMessages.length !== 0) {
        console.log(checked.errorMessages.join('\n'));
      }
      if (findIndex === -1) {
        origin.push(newInfo);
      } else {
        origin[findIndex] = newInfo;
      }
      writeResult(origin);
      return ret.concat([newInfo]);
    }), Promise.resolve([]));
  nightmare.end().then(() => console.log('完成！'));
  // TODO: 输出运行时长

  const changesDir = path.join(__dirname, '..', '..', 'output', 'changes');
  const changesPath = path.join(changesDir, `${getTodayDate()}-changes.txt`);
  if (!fs.existsSync(changesDir)) {
    fs.mkdirSync(changesDir);
  }
  fs.writeFileSync(changesPath, allMessages.join('\n'), 'utf8');

  const origin2 = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
    .filter(obj => !_.find(ruleoutItems, (ruleoutItem) =>
    (ruleoutItem.url && obj.url && ruleoutItem.url === obj.url)
    || (ruleoutItem.id && obj.id && ruleoutItem.id === obj.id))); // 过滤手动排除的内容
  fs.writeFileSync(fullOutputPath, JSON.stringify(origin2), 'utf8');

  return newOrigin;
};

const nightmareDo = (nightmare) => {
  nightmare
    .click('.next a')
    .wait('.nav-user-account')
    .evaluate(() => document.body.innerHTML)
    .then(async (content) => {
      const flag = await extractFilmName(content);
      if (flag) {
        return nightmareDo(nightmare);
      }
      return analyzeAll(nightmare);
    })
    .catch((error) => {
      console.log('[nightmare do error]: ', error);
    });
};

const main = () => {
  initialize();

  const nightmare = Nightmare({ show: true });

  nightmare
    .goto('https://www.douban.com/accounts/login?source=movie')
    .type('#email', nightmareConfig.username)
    .type('#password', nightmareConfig.password)
    .click('.btn-submit')
    .wait('.nav-user-account')

    .goto(`https://movie.douban.com/people/${targetId}/collect`)
    .wait('.nav-user-account')
    .evaluate(() => document.body.innerHTML)
    .then(async (content) => {
      const flag = await extractFilmName(content);
      if (flag) {
        return nightmareDo(nightmare);
      }
      return analyzeAll(nightmare);
    })
    .catch((error) => {
      console.error('[nightmare error]: ', error);
    });
};

main();
