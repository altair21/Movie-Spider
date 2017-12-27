/* global document */
import cheerio from 'cheerio';
import Nightmare from 'nightmare';
import _ from 'lodash';

import { carveDetailInfo, mergeObject } from '../basehelper';
import { ScoreDefinition } from '../preset/valueDef';

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

const analyze = (nightmare = Nightmare({ show: true }), url, obj) => new Promise((resolve, reject) => {
  nightmare
    .goto(url)
    .wait('.nav-user-account')
    .evaluate(() => document.body.innerHTML)
    .then(async (content) => {
      const newInfo = await getDetailInfoExceptPoster(obj, content);
      const merged = mergeObject(obj, newInfo);
      const resInfo = obj ? merged.newObject : newInfo;
      resolve({ resInfo, messages: merged.messages });
    })
    .catch(reject);
});

export { getDetailInfoExceptPoster, analyze };
