import _ from 'lodash';

import { getPosterInfo, getText, hdThumbPoster } from './util/';
import {
  extractDetailURL, extractRoughName, extractRoughPoster,
  extractTags, extractRoughInfo, extractDetailYear, extractDetailDirector,
  extractDetailPoster, extractDetailName,
} from './xpath';

const createStepRange = (step) => (end) => _.range(0, end, step);

const carveRoughInfo = {
  id: (content) => {
    const url = extractDetailURL(content);
    if (url) {
      return url.match(/\d+/)[0];
    }
    return url;
  },
  href: (content) => {
    const url = extractDetailURL(content);
    if (url) {
      return url.split('\n').join('').replace('https://movie.douban.com', '');
    }
    return url;
  },
  poster: (content) => hdThumbPoster(extractRoughPoster(content)),
  multiName: (content) => extractRoughName(content),
  name: (content) => {
    const multiName = extractRoughName(content);
    if (multiName) {
      return multiName.split('/')[0].trim();
    }
    return multiName;
  },
  tags: (content) => extractTags(content).filter(tag => tag.indexOf('标签') === -1),
};

const carveDetailInfo = {
  name: extractDetailName,
  poster: extractDetailPoster,
  year: extractDetailYear,
  director: extractDetailDirector,
};

const getRoughInfo = (content) => {
  const logs = [];
  let id, url, posterURL, name, multiName, tags;  // eslint-disable-line
  try {
    id = carveRoughInfo.id(content);
    url = carveRoughInfo.href(content);
    name = carveRoughInfo.name(content);
    multiName = carveRoughInfo.multiName(content);
    tags = carveRoughInfo.tags(content);
    posterURL = carveRoughInfo.poster(content);
  } catch (e) {
    // console.log('爬取简要信息失败', url);
    // console.log(e);
    logs.push(e);
  }
  return {
    id, url, posterURL, name, multiName, tags,
  };
};

const getRoughInfos = (content) => {
  const roughinfos = extractRoughInfo(content);
  if (roughinfos) {
    return roughinfos.map(getRoughInfo);
  }
  return [];
};

const getDetailInfo = async (info) => {
  if (!info || !info.url) {
    return {
      ...info,
      year: '',
      director: [],
      w: 0,
      h: 0,
      color: '',
      yearError: true,
      directorError: true,
      posterError: true,
    };
  }

  const content = await getText(info.url);

  let posterURL, year, director, imgInfo; // eslint-disable-line
  try {
    posterURL = carveDetailInfo.poster(content);
    year = carveDetailInfo.year(content);
    director = carveDetailInfo.director(content);

    imgInfo = await getPosterInfo(posterURL);
  } catch (e) {
    // console.error(`《${info.name}》详细页中失败(https://movie.douban.com${info.url}): ${e}`);
    imgInfo = await getPosterInfo(info.posterURL);
  }

  return {
    id: info.id,
    url: info.url,
    name: info.name,
    year,
    director,
    posterURL: posterURL || info.posterURL || '',
    w: imgInfo.width || 0,
    h: imgInfo.height || 0,
    color: imgInfo.color || 'white',
    tags: info.tags,
    multiName: info.multiName,
    posterError: !posterURL && !info.posterURL,
    yearError: !year,
    directorError: !director || director.length === 0,
  };
};

const mergeObject = (oldObj, newObj) => {
  const res = {
    ...oldObj,
    name: newObj.name || oldObj.name,
    yearError: oldObj.yearError && newObj.yearError,
    posterError: oldObj.posterError && newObj.posterError,
    directorError: oldObj.directorError && newObj.directorError,
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
    res.director = _.cloneDeep(newObj.director) || _.cloneDeep(oldObj.director);
  }

  return res;
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
  getDetailInfo, mergeObject,
};
