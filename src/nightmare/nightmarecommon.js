/* global document */
import readline from 'readline';
import cheerio from 'cheerio';
import Nightmare from 'nightmare';
import _ from 'lodash';

import { carveDetailInfo, mergeObject } from '../basehelper';
import { ScoreDefinition, NodeEnvDefinition } from '../preset/valueDef';
import { Color, ColorType, colored } from '../logger/';
import { getTimeByHMS } from '../util/';

const statColored = (text) => colored(ColorType.foreground)(Color.blue)(`[${getTimeByHMS()}]: ${text}`);
const errorColored = (text) => colored(ColorType.foreground)(Color.red)(`[${getTimeByHMS()}]: ${text}`);
const terribleErrorColored = (text) => colored(ColorType.background)(Color.red)(`[${getTimeByHMS()}]: ${text}`);

// 和 `basehelper.js` 里的同名函数相比，没有获取 award 信息
const getDetailInfoExceptAward = async (info, content, len) => {
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
  // const currentYear = (new Date()).getFullYear();

  try {
    const $ = cheerio.load(content);
    if (process.env.NODE_ENV === NodeEnvDefinition.development) {
      process.stdout.write(statColored(`${len}. ${info.name}(${info.url}) 爬取完成，正在分析...`));
    }

    const year = carveDetailInfo.year($);
    const director = carveDetailInfo.director($);
    const score = carveDetailInfo.score($);
    const numberOfScore = carveDetailInfo.numberOfScore($);
    const category = carveDetailInfo.category($);
    const country = carveDetailInfo.country($);
    const releaseDate = carveDetailInfo.releaseDate($);
    const numberOfWatched = carveDetailInfo.numberOfWatched($);
    const numberOfWanted = carveDetailInfo.numberOfWanted($);
    const friendsScore = carveDetailInfo.friendsScore($);
    const friendsNoS = carveDetailInfo.friendsNoS($);
    const refFilms = carveDetailInfo.refFilms($);

    if (process.env.NODE_ENV === NodeEnvDefinition.development) {
      readline.clearLine(process.stdout);
      readline.cursorTo(process.stdout, 0);
      if (_.isEmpty(year) && _.isEmpty(score) && _.isEmpty(numberOfScore)) {
        process.stdout.write(errorColored(`${len}. ${info.name}(${info.url}) 分析失败！\n`));
      } else {
        process.stdout.write(statColored(`${len}. ${info.name}(${info.url}) 分析完成!\n`));
      }
    }
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
      country,
      releaseDate,
      numberOfWatched,
      numberOfWanted,
      friendsScore,
      friendsNoS,
      refFilms,
      // hasAwards: (currentYear - year <= 3) && carveDetailInfo.hasAwards($),
      hasAwards: carveDetailInfo.hasAwards($),

      posterError: info.posterError,
      yearError: !checkStringLegal(year),
      directorError: !director || director.length === 0,
      scoreError: !score || score === ScoreDefinition.GetFailure,
      numberOfScoreError: !numberOfScore || numberOfScore === ScoreDefinition.GetFailure,
      categoryError: !category || category.length === 0,
      refFilmsError: !refFilms || refFilms.length === 0,
    };
  } catch (e) {
    console.log(terribleErrorColored(`function 'getDetailInfoExceptAward' error: ${e}`));
    return fallbackRes;
  }
};

const retryTimes = 10;

const analyzeAward = async (nightmare, url) => new Promise((resolve) => {
  nightmare
    .goto(url)
    .wait('.nav-user-account')
    .evaluate(() => document.body.innerHTML)
    .then(async (content) => {
      const awards = carveDetailInfo.extractDetailAwards(cheerio.load(content));
      resolve(awards);
    });
});

const analyze = (nightmare = Nightmare({ show: true }), url, newObj, oldObj, len = 0, times = 0) => new Promise((resolve, reject) => {
  nightmare
    .goto(url)
    .wait('.nav-user-account')
    .evaluate(() => document.body.innerHTML)
    .then(async (content) => {
      const newInfo = await getDetailInfoExceptAward(newObj, content, len);
      if (newInfo.hasAwards) {
        newInfo.awards = await analyzeAward(nightmare, `${url}/awards`);
      }
      delete newInfo.hasAwards;
      let resInfo = newInfo;
      let messages = [];
      if (oldObj) {
        const merged = mergeObject(oldObj, newInfo);
        resInfo = merged.newObject;
        messages = merged.messages;
      }
      resolve({ resInfo, messages });
    })
    .catch((e) => {
      if (times >= retryTimes) {
        reject(e);
      }
      console.log(errorColored('[分析失败]:', e, `开始重试，第 ${times + 1} 次`));
      analyze(nightmare, url, newObj, oldObj, len, times + 1);
    });
});

export { getDetailInfoExceptAward, analyze };
