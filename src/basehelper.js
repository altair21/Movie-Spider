import _ from 'lodash';

import { ScoreDefinition } from './preset/valueDef';
import {
  getPosterInfo, getText, hdThumbPoster, JSONPathToObject,
} from './util/';
import {
  extractDetailURL, extractRoughName, extractRoughPoster,
  extractRoughTags, extractRoughInfos, extractDetailYear, extractDetailDirector,
  extractDetailPoster, extractDetailName, extractRoughUserComment,
  extractRoughUserScore, extractRoughMarkDate, extractDetailCategory,
  extractDetailNumOfScore, extractDetailScore, extractDetailRefFilms,
} from './xpath';

const createStepRange = (step) => (end) => _.range(0, end, step);

const removeLF = (str) => str.split('\n').join('');

const carveRoughInfo = {
  id: (content) => {
    const url = removeLF(extractDetailURL(content));
    if (url.match(/\d+/)) {
      return url.match(/\d+/)[0];
    }
    return url;
  },
  href: (content) => {
    const url = extractDetailURL(content);
    return removeLF(url).replace('https://movie.douban.com', '');
  },
  poster: (content) => hdThumbPoster(removeLF(extractRoughPoster(content))),
  multiName: (content) => {
    const multiName = extractRoughName(content);
    return removeLF(multiName).split('/').map(name => removeLF(name).trim()).join(' / ');
  },
  name: (content) => {
    const multiName = extractRoughName(content);
    return removeLF(multiName.split('/')[0].trim());
  },
  tags: (content) => extractRoughTags(content).map(tag => removeLF(tag)).filter(tag => tag.indexOf('标签') === -1),
  userScore: (content) => extractRoughUserScore(content),
  userComment: (content) => removeLF(extractRoughUserComment(content)),
  markDate: (content) => removeLF(extractRoughMarkDate(content)),
};

const carveDetailInfo = {
  name: (content) => removeLF(extractDetailName(content)),
  poster: (content) => {
    const posterURL = extractDetailPoster(content);
    return removeLF(posterURL);
  },
  year: (content) => removeLF(extractDetailYear(content)),
  director: (content) => extractDetailDirector(content).map(director => removeLF(director)),
  category: (content) => extractDetailCategory(content).map(val => removeLF(val)),
  score: (content) => extractDetailScore(content),
  numberOfScore: (content) => extractDetailNumOfScore(content),
  refFilms: (content) => extractDetailRefFilms(content)
    .map(val => ({ ...val, name: removeLF(val.name) })),
};

const getRoughInfo = (content) => {
  const id = carveRoughInfo.id(content);
  const url = carveRoughInfo.href(content);
  const name = carveRoughInfo.name(content);
  const multiName = carveRoughInfo.multiName(content);
  const tags = carveRoughInfo.tags(content);
  const posterURL = carveRoughInfo.poster(content);
  const userScore = carveRoughInfo.userScore(content);
  const userComment = carveRoughInfo.userComment(content);
  const markDate = carveRoughInfo.markDate(content);
  return {
    id, url, posterURL, name, multiName, tags, userScore, userComment, markDate,
  };
};

const getRoughInfos = (content) =>
  extractRoughInfos(content).map(getRoughInfo);

const getDetailInfo = async (info) => {
  if (!info || !info.url) {
    return {
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
  }

  const content = await getText(info.url);

  const posterURL = carveDetailInfo.poster(content);
  const year = carveDetailInfo.year(content);
  const director = carveDetailInfo.director(content);
  const score = carveDetailInfo.score(content);
  const numberOfScore = carveDetailInfo.numberOfScore(content);
  const category = carveDetailInfo.category(content);
  const refFilms = carveDetailInfo.refFilms(content);

  let imgInfo = { width: 0, height: 0, color: 'white' };
  try {
    imgInfo = await getPosterInfo(posterURL || info.posterURL);
  } catch (e) {
    // console.error(e);
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
    markDate: info.markDate,
    multiName: info.multiName,

    year,
    director,
    score: score || ScoreDefinition.GetFailure,
    numberOfScore: numberOfScore || ScoreDefinition.GetFailure,
    category,
    refFilms,

    posterError: !checkStringLegal(posterURL) && !checkStringLegal(info.posterURL)
    && imgInfo.width > 0 && imgInfo.height > 0,
    yearError: !checkStringLegal(year),
    directorError: !director || director.length === 0,
    scoreError: !score || score === ScoreDefinition.GetFailure,
    numberOfScoreError: !numberOfScore || numberOfScore === ScoreDefinition.GetFailure,
    categoryError: !category || category.length === 0,
    refFilmsError: !refFilms || refFilms.length === 0,
  };
};

const concurrentGetDetailInfo = async (infoArr) => {
  const res = await Promise.all(infoArr.map(async info => {
    const ret = await getDetailInfo(info);
    return ret;
  }));
  return res;
};

const mergeObject = (oldObj, newObj) => {
  const res = {
    ...oldObj,
    name: newObj.name || oldObj.name,
    tags: (newObj.tags && newObj.tags.length > 0) ? _.cloneDeep(newObj.tags) : _.cloneDeep(oldObj.tags),
    multiName: newObj.multiName || oldObj.multiName,
    userScore: newObj.userScore > 0 ? newObj.userScore : oldObj.userScore,
    userComment: newObj.userComment || oldObj.userComment,
    markDate: newObj.markDate || oldObj.markDate,

    yearError: (oldObj.yearError || oldObj.yearError == undefined) && newObj.yearError, // eslint-disable-line eqeqeq
    posterError: (oldObj.posterError || oldObj.posterError == undefined) && newObj.posterError,  // eslint-disable-line eqeqeq
    directorError: (oldObj.directorError || oldObj.directorError == undefined) && newObj.directorError, // eslint-disable-line eqeqeq
    categoryError: (oldObj.categoryError || oldObj.categoryError == undefined) && newObj.categoryError, // eslint-disable-line eqeqeq
    scoreError: (oldObj.scoreError || oldObj.scoreError == undefined) && newObj.scoreError, // eslint-disable-line eqeqeq
    numberOfScoreError: (oldObj.numberOfScoreError || oldObj.numberOfScoreError == undefined) && newObj.numberOfScoreError, // eslint-disable-line eqeqeq
    refFilmsError: (oldObj.refFilmsError || oldObj.refFilmsError == undefined) && newObj.refFilmsError, // eslint-disable-line eqeqeq
  };

  if (!newObj.posterError) {
    res.posterURL = newObj.posterURL || oldObj.posterURL;
    res.w = newObj.w || oldObj.w;
    res.h = newObj.h || oldObj.h;
    res.color = newObj.color || oldObj.color;
  }
  if (!newObj.yearError) {
    res.year = newObj.year || oldObj.year;
  }
  if (!newObj.directorError) {
    res.director = (newObj.director && newObj.director.length) ? _.cloneDeep(newObj.director) : _.cloneDeep(oldObj.director);
  }
  if (!newObj.categoryError) {
    res.category = (newObj.category && newObj.category.length) ? _.cloneDeep(newObj.category) : _.cloneDeep(oldObj.category);
  }
  if (!newObj.scoreError) {
    res.score = newObj.score;
  }
  if (!newObj.numberOfScoreError) {
    res.numberOfScore = newObj.numberOfScore;
  }
  if (!newObj.refFilmsError) {
    res.refFilms = _.uniqWith((oldObj.refFilms || []).concat(newObj.refFilms), (a, b) => a.id === b.id);
  }

  return res;
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

  return getRoughInfos(content);
};

export {
  createStepRange, carveRoughInfo, carveDetailInfo, getURLs, genOffsetStep15,
  getDetailInfo, mergeObject, removeLF, concurrentGetDetailInfo,
  filterRuleOutItem,
};
