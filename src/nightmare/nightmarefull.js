/* global document */
import fs from 'fs';
import path from 'path';
import Nightmare from 'nightmare';
import cheerio from 'cheerio';
import _ from 'lodash';

import { checkProperty, getPosterInfo } from '../util/';
import { analyze } from './nightmarecommon';
import { getRoughInfos } from '../basehelper';

const targetId = 4513116;

const fullOutputPath = path.join(__dirname, '..', '..', 'output', 'full_output.json');
const configPath = path.join(__dirname, '..', '..', 'config.json');
const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const nightmareConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'nightmare-config.json'), 'utf8'));
let res = [];

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

  if (!config.keywords || config.keywords.length < 1 || tags.length === 0 || avaiIndex.length === 0) {
    res = res.concat(resObj);
    return !!$('.next a')[0];
  }

  const ret = [];
  for (let i = 0, l = avaiIndex.length; i < l; i++) {
    ret.push(resObj[avaiIndex[i]]);
  }
  res = res.concat(ret);
  return !!$('.next a')[0];
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
  const newOrigin = await arr.reduce((promise, index) =>
    promise.then(async (ret) => {
      const findIndex = _.findIndex(origin, (o) => o.id === res[index].id);
      const newAnalyzed = await analyze(nightmare, `https://movie.douban.com${res[index].url}`, findIndex !== -1 ? origin[findIndex] : res[index]);
      const newInfo = newAnalyzed.resInfo;
      console.log(newAnalyzed.messages.join('\n'));

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
