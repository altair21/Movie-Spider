import readline from 'readline';
import _ from 'lodash';
import cheerio from 'cheerio';

import {
  ScoreDefinition, NodeEnvDefinition, RequestEnvDefinition,
} from './preset/valueDef';
import {
  getPosterInfo, getText, hdThumbPoster, JSONPathToObject, sleep, getTimeByHMS,
} from './util/';
import {
  extractDetailURL, extractRoughName, extractRoughPoster,
  extractRoughTags, extractRoughInfos, extractDetailYear, extractDetailDirector,
  extractDetailPoster, extractDetailName, extractRoughUserComment,
  extractRoughCommentLikes, extractRoughUserScore, extractRoughMarkDate,
  extractDetailCategory, extractDetailCountry, extractDetailNumOfScore,
  extractDetailScore, extractDetailRefFilms, extractDetailReleaseDate,
  extractDetailNumberOfWatched, extractDetailNumberOfWanted,
  extractDetailFriendsNoS, extractDetailFriendsScore,
} from './xpath';
import { colored, Color, ColorType } from './logger/';

const createStepRange = (step) => (end) => _.range(0, end, step);
const changesColored = colored(ColorType.foreground)(Color.green);
const statColored = (text) => colored(ColorType.background)(Color.blue)(colored(ColorType.foreground)(Color.black)(text));
const errorColored = (text) => colored(ColorType.foreground)(Color.red)(`[${getTimeByHMS()}]: ${text}`);
const terribleErrorColored = (text) => colored(ColorType.background)(Color.red)(`[${getTimeByHMS()}]: ${text}`);

const removeLF = (str) => str.split('\n').join('');

const carveRoughInfo = {
  id: ($) => {
    const url = removeLF(extractDetailURL($));
    if (url.match(/\d+/)) {
      return url.match(/\d+/)[0];
    }
    return url;
  },
  href: ($) => {
    const url = extractDetailURL($);
    return removeLF(url).replace('https://movie.douban.com', '');
  },
  poster: ($) => hdThumbPoster(removeLF(extractRoughPoster($))),
  multiName: ($) => {
    const multiName = extractRoughName($);
    return removeLF(multiName).split('/').map(name => removeLF(name).trim()).join(' / ');
  },
  name: ($) => {
    const multiName = extractRoughName($);
    return removeLF(multiName.split('/')[0].trim());
  },
  tags: ($) => extractRoughTags($).map(tag => removeLF(tag)).filter(tag => tag.indexOf('标签') === -1),
  userScore: ($) => extractRoughUserScore($),
  userComment: ($) => removeLF(extractRoughUserComment($)),
  commentLikes: ($) => extractRoughCommentLikes($),
  markDate: ($) => removeLF(extractRoughMarkDate($)),
};

const carveDetailInfo = {
  name: ($) => removeLF(extractDetailName($)),
  poster: ($) => {
    const posterURL = extractDetailPoster($);
    return removeLF(posterURL);
  },
  year: ($) => removeLF(extractDetailYear($)),
  director: ($) => extractDetailDirector($).map(director => removeLF(director)),
  category: ($) => extractDetailCategory($).map(val => removeLF(val)),
  score: ($) => extractDetailScore($),
  numberOfScore: ($) => extractDetailNumOfScore($),
  country: ($) => extractDetailCountry($),
  releaseDate: ($) => extractDetailReleaseDate($),
  numberOfWatched: ($) => extractDetailNumberOfWatched($),
  numberOfWanted: ($) => extractDetailNumberOfWanted($),
  friendsScore: ($) => extractDetailFriendsScore($),
  friendsNoS: ($) => extractDetailFriendsNoS($),
  refFilms: ($) => extractDetailRefFilms($)
    .map(val => ({ ...val, name: removeLF(val.name) })),
};

const getRoughInfo = (content) => {
  const $ = cheerio.load(content);
  const id = carveRoughInfo.id($);
  const url = carveRoughInfo.href($);
  const name = carveRoughInfo.name($);
  const multiName = carveRoughInfo.multiName($);
  const tags = carveRoughInfo.tags($);
  const posterURL = carveRoughInfo.poster($);
  const userScore = carveRoughInfo.userScore($);
  const userComment = carveRoughInfo.userComment($);
  const commentLikes = carveRoughInfo.commentLikes($);
  const markDate = carveRoughInfo.markDate($);
  return {
    id, url, posterURL, name, multiName, tags, userScore, userComment, commentLikes, markDate,
  };
};

const getRoughInfos = (content) =>
  extractRoughInfos(cheerio.load(content)).map(getRoughInfo);

const getDetailInfo = async (info, len) => {
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

  if (!info || !info.url) {
    return fallbackRes;
  }

  try {
    const content = await getText(info.url);
    if (process.env.NODE_ENV === NodeEnvDefinition.development) {
      process.stdout.write(statColored(`${len}. ${info.name}(${info.url}) 爬取完成，正在分析...`));
    }
    const $ = cheerio.load(content);

    const posterURL = carveDetailInfo.poster($);
    const year = carveDetailInfo.year($);
    const director = carveDetailInfo.director($);
    const score = carveDetailInfo.score($);
    const numberOfScore = carveDetailInfo.numberOfScore($);
    const category = carveDetailInfo.category($);
    const refFilms = carveDetailInfo.refFilms($);
    const country = carveDetailInfo.country($);
    const releaseDate = carveDetailInfo.releaseDate($);
    const numberOfWatched = carveDetailInfo.numberOfWatched($);
    const numberOfWanted = carveDetailInfo.numberOfWanted($);
    const friendsScore = carveDetailInfo.friendsScore($);
    const friendsNoS = carveDetailInfo.friendsNoS($);

    let imgInfo = { width: 0, height: 0, color: 'white' };
    try {
      imgInfo = await getPosterInfo(posterURL || info.posterURL);
    } catch (e) {
      if (process.env.NODE_ENV === NodeEnvDefinition.development) {
        console.log(terribleErrorColored(`海报处理失败 ${posterURL || info.posterURL}`));
      }
    }

    await sleep(Math.random() * 1500 + 1500); // IP 保护

    if (process.env.NODE_ENV === NodeEnvDefinition.development) {
      readline.clearLine(process.stdout);
      readline.cursorTo(process.stdout, 0);
      if (_.isEmpty(year) && _.isEmpty(score) && _.isEmpty(posterURL) && _.isEmpty(numberOfScore)) {
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
      posterURL: posterURL || info.posterURL || '',
      w: imgInfo.width || 0,
      h: imgInfo.height || 0,
      color: imgInfo.color || 'white',
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
      friendsNoS,
      friendsScore,
      refFilms,

      posterError: !checkStringLegal(posterURL) && !checkStringLegal(info.posterURL)
      && imgInfo.width > 0 && imgInfo.height > 0,
      yearError: !checkStringLegal(year),
      directorError: !director || director.length === 0,
      scoreError: !score || score === ScoreDefinition.GetFailure,
      numberOfScoreError: !numberOfScore || numberOfScore === ScoreDefinition.GetFailure,
      categoryError: !category || category.length === 0,
      refFilmsError: !refFilms,
    };
  } catch (e) {
    console.log(terribleErrorColored(`function 'getDetailInfo' error: ${e}`));
    return fallbackRes;
  }
};

const concurrentGetDetailInfo = async (infoArr, len) => {
  const res = await Promise.all(infoArr.map(async info => {
    const ret = await getDetailInfo(info, len);
    return ret;
  }));
  return res;
};

const mergeObject = (oldObj, newObj) => {
  const messages = [];
  const res = {
    ...oldObj,
    name: newObj.name || oldObj.name,
    tags: (newObj.tags && newObj.tags.length > 0) ? _.cloneDeep(newObj.tags) : _.cloneDeep(oldObj.tags),
    multiName: newObj.multiName && newObj.multiName.indexOf('�') === -1 ?
      newObj.multiName : oldObj.multiName,
    userScore: newObj.userScore > 0 ? newObj.userScore : oldObj.userScore,
    userComment: newObj.userComment || oldObj.userComment || '',
    commentLikes: newObj.commentLikes != undefined ? newObj.commentLikes : oldObj.commentLikes, // eslint-disable-line
    markDate: newObj.markDate || oldObj.markDate,
    country: newObj.country && newObj.country.length > 0 ? newObj.country : oldObj.country,
    releaseDate: newObj.releaseDate && newObj.releaseDate.length > 0 ? newObj.releaseDate : oldObj.releaseDate,
    numberOfWatched: !_.isNull(newObj.numberOfWatched) ? newObj.numberOfWatched : oldObj.numberOfWatched,
    numberOfWanted: !_.isNull(newObj.numberOfWanted) ? newObj.numberOfWanted : oldObj.numberOfWanted,
    friendsScore: !_.isNull(newObj.friendsScore) ? newObj.friendsScore : oldObj.friendsScore,
    friendsNoS: !_.isNull(newObj.friendsNoS) ? newObj.friendsNoS : oldObj.friendsNoS,

    yearError: (oldObj.yearError || oldObj.yearError == undefined) && newObj.yearError, // eslint-disable-line eqeqeq
    posterError: (oldObj.posterError || oldObj.posterError == undefined) && newObj.posterError,  // eslint-disable-line eqeqeq
    directorError: (oldObj.directorError || oldObj.directorError == undefined) && newObj.directorError, // eslint-disable-line eqeqeq
    categoryError: (oldObj.categoryError || oldObj.categoryError == undefined) && newObj.categoryError, // eslint-disable-line eqeqeq
    scoreError: (oldObj.scoreError || oldObj.scoreError == undefined) && newObj.scoreError, // eslint-disable-line eqeqeq
    numberOfScoreError: (oldObj.numberOfScoreError || oldObj.numberOfScoreError == undefined) && newObj.numberOfScoreError, // eslint-disable-line eqeqeq
    refFilmsError: (oldObj.refFilmsError || oldObj.refFilmsError == undefined) && newObj.refFilmsError, // eslint-disable-line eqeqeq
  };

  if (newObj.name !== oldObj.name && oldObj.name) messages.push(`${oldObj.name} 片名修改：${oldObj.name} ---> ${newObj.name}`);
  if (!_.isEqual(newObj.tags, oldObj.tags && oldObj.tags) && newObj.tags && newObj.tags.length > 0 && oldObj.tags) messages.push(`${newObj.name} 标签修改： ${oldObj.tags} ---> ${newObj.tags}`);
  if (newObj.multiName !== oldObj.multiName && newObj.multiName.indexOf('�') === -1 && oldObj.multiName) messages.push(`${newObj.name} 长片名修改：${oldObj.multiName} ---> ${newObj.multiName}`);
  if (newObj.userScore !== oldObj.userScore && oldObj.userScore) messages.push(`${newObj.name} 用户评分修改：${oldObj.userScore} ---> ${newObj.userScore}`);
  if (newObj.userComment !== oldObj.userComment && oldObj.userComment) messages.push(`${newObj.name} 用户短评修改：${oldObj.userComment} ---> ${newObj.userComment}`);
  if (newObj.commentLikes !== oldObj.commentLikes && oldObj.commentLikes) {
    if (process.env.NODE_ENV === NodeEnvDefinition.development) {
      messages.push(changesColored(`${newObj.name} 用户短评被赞：${oldObj.commentLikes} ---> ${newObj.commentLikes}`));
    } else {
      messages.push(`${newObj.name} 用户短评被赞：${oldObj.commentLikes} ---> ${newObj.commentLikes}`);
    }
  }

  if (newObj.posterError === false) {
    res.posterURL = newObj.posterURL || oldObj.posterURL;
    res.w = newObj.w || oldObj.w;
    res.h = newObj.h || oldObj.h;
    res.color = newObj.color || oldObj.color;
    if (newObj.posterURL !== oldObj.posterURL && oldObj.posterURL) messages.push(`${newObj.name} 海报修改：${oldObj.posterURL} ---> ${newObj.posterURL}`);
  }
  if (newObj.yearError === false) {
    res.year = newObj.year || oldObj.year;
    if (newObj.year !== oldObj.year && oldObj.year) messages.push(`${newObj.name} 年份修改：${oldObj.year} ---> ${newObj.year}`);
  }
  if (newObj.directorError === false) {
    res.director = (newObj.director && newObj.director.length) ? _.cloneDeep(newObj.director) : _.cloneDeep(oldObj.director);
    if (!_.isEqual(newObj.director, oldObj.director && oldObj.director) && newObj.director && newObj.director.length) messages.push(`${newObj.name} 导演信息修改：${oldObj.director} ---> ${newObj.director}`);
  }
  if (newObj.categoryError === false) {
    res.category = (newObj.category && newObj.category.length) ? _.cloneDeep(newObj.category) : _.cloneDeep(oldObj.category);
    if (!_.isEqual(newObj.category, oldObj.category) && newObj.category && newObj.category.length && oldObj.category) messages.push(`${newObj.name} 分类修改：${oldObj.category} ---> ${newObj.category}`);
  }
  if (newObj.scoreError === false) {
    res.score = newObj.score;
    if (newObj.score !== oldObj.score && oldObj.score) {
      if (Math.abs(Math.floor(+newObj.score) - Math.floor(+oldObj.score)) >= 1) {
        messages.push(changesColored(`${newObj.name} 评分变化：${oldObj.score} ---> ${newObj.score}`));
      } else {
        messages.push(`${newObj.name} 评分变化：${oldObj.score} ---> ${newObj.score}`);
      }
    }
  }
  if (newObj.numberOfScoreError === false) {
    res.numberOfScore = newObj.numberOfScore;
  }
  if (newObj.refFilmsError === false) {
    res.refFilms = _.uniqWith((oldObj.refFilms || []).concat(newObj.refFilms), (a, b) => a.id === b.id);
  }

  return { newObject: res, messages };
};

const filterRuleOutItem = (array, filterPath) => {
  const filter = JSONPathToObject(filterPath);
  return _.filter(array, (o) => !_.find(filter, (v) => o.id && o.id === v.id));
};

const genOffsetStep15 = createStepRange(15);

const getURLs = async (id, offset) => {
  const content = await getText(`/people/${id}/collect`, {
    start: offset,
    sort: 'time',
    rating: 'all',
    filter: 'all',
    mode: 'grid',
  });

  if (process.env.NODE_ENV === NodeEnvDefinition.development
    && process.env.REQUEST_ENV === RequestEnvDefinition.shell) {
    console.log(statColored(`已爬取 ${offset} 个简要信息`));
  }
  return getRoughInfos(content);
};

export {
  createStepRange, carveRoughInfo, carveDetailInfo, getURLs, genOffsetStep15,
  getDetailInfo, mergeObject, removeLF, concurrentGetDetailInfo,
  filterRuleOutItem, getRoughInfos,
};
