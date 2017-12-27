/* global document */
import fs from 'fs';
import path from 'path';
import Nightmare from 'nightmare';
import cheerio from 'cheerio';
import _ from 'lodash';

import { carveDetailInfo, mergeObject } from '../basehelper';
import { ScoreDefinition } from '../preset/valueDef';
import { checkProperty } from '../util/text';

const fullOutputPath = path.join(__dirname, '..', '..', 'output', 'full_output.json');
const configPath = path.join(__dirname, '..', '..', 'config.json');
const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const nightmareConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'nightmare-config.json'), 'utf8'));

// 和 `basehelper.js` 里的同名函数相比，使用了原始 `info` 中的海报信息
const getDetailInfoExceptPoster = async (info, content) => {
  const fallbackRes = {
    ...info,
    year: '',
    director: [],
    w: 0,
    h: 0,
    color: '',
    category: [],
    score: -1,
    numberOfScore: -1,
    refFilms: [],
    yearError: true,
    directorError: true,
    posterError: true,
    categoryError: true,
    scoreError: true,
    numberOfScoreError: true,
    refFilmsError: true,
  };

  try {
    const $ = cheerio.load(content);

    const year = carveDetailInfo.year($);
    const director = carveDetailInfo.director($);
    const score = carveDetailInfo.score($);
    const numberOfScore = carveDetailInfo.numberOfScore($);
    const category = carveDetailInfo.category($);
    const refFilms = carveDetailInfo.refFilms($);

    const checkStringLegal = (str) => str && str !== '';
    return {
      id: info.id,
      url: info.url,
      name: info.name,
      posterURL: info.posterURL || '',
      w: info.w,
      h: info.h,
      color: info.color || 'white',
      tags: _.cloneDeep(info.tags),
      userScore: info.userScore || ScoreDefinition.GetFailure,
      userComment: info.userComment,
      commentLikes: info.commentLikes,
      markDate: info.markDate,
      multiName: info.multiName,

      year,
      director,
      score: score || ScoreDefinition.GetFailure,
      numberOfScore: numberOfScore || ScoreDefinition.GetFailure,
      category,
      refFilms,

      posterError: info.posterError,
      yearError: !checkStringLegal(year),
      directorError: !director || director.length === 0,
      scoreError: !score || score === ScoreDefinition.GetFailure,
      numberOfScoreError: !numberOfScore || numberOfScore === ScoreDefinition.GetFailure,
      categoryError: !category || category.length === 0,
      refFilmsError: !refFilms || refFilms.length === 0,
    };
  } catch (e) {
    console.error(`function 'getDetailInfoExceptPoster' error: ${e}`);
    return fallbackRes;
  }
};

const writeResult = (newOrigin) => {
  fs.writeFileSync(fullOutputPath, JSON.stringify(newOrigin), 'utf8');
  // console.log('输出文件更新完成！');
  return 0;
};

const analyze = (nightmare = Nightmare({ show: true }), url, obj) => new Promise((resolve, reject) => {
  nightmare
    .goto(url)
    .wait('.nav-user-account')
    .evaluate(() => document.body.innerHTML)
    .then(async (content) => {
      const newInfo = await getDetailInfoExceptPoster(obj, content);
      const resInfo = mergeObject(obj, newInfo);
      resolve(resInfo);
    })
    .catch(reject);
});

const main = async () => {
  const nightmare = Nightmare({ show: true });
  let total = 0;

  try {
    await nightmare
      .goto('https://www.douban.com/accounts/login?source=movie')
      .type('#email', nightmareConfig.username)
      .type('#password', nightmareConfig.password)
      .click('.btn-submit')
      .wait('.nav-user-account')
      .evaluate(() => document.body.innerHTML)
      .then(async () => {
        const arr = _.range(origin.length);
        const newOrigin = arr.reduce((promise, index) =>
          promise.then(async (res) => {
            if ((origin[index].categoryError === false
              && origin[index].scoreError === false
              && origin[index].numberOfScoreError === false
              && origin[index].refFilmsError === false)
              || origin[index].isManual) {
              return res.concat([origin[index]]);
            }
            const newInfo = await analyze(nightmare, `https://movie.douban.com${origin[index].url}`, origin[index]);
            const checked = checkProperty(newInfo, config);
            if (checked.errorMessages.length === 0) {
              console.log(`=: ${newInfo.name} 补充完成！`);
            } else {
              console.log(checked.errorMessages.join('\n'));
            }
            total++;
            origin[index] = newInfo;
            writeResult(origin);
            return res.concat([newInfo]);
          }), Promise.resolve([]));
        return newOrigin;
      })
      // .then(writeResult)
      .then(() => console.log(`一共更新 ${total} 项`))
      .catch(console.log);
  } catch (e) {
    console.log('[nightmare error]: ', e);
  }
};

main();

export { getDetailInfoExceptPoster };
