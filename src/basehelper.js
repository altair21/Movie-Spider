import _ from 'lodash';

import { getPosterInfo, getText, hdThumbPoster } from './util/';
import {
  extractDetailURL, extractRoughName, extractRoughPoster,
  extractTags, extractRoughInfos, extractDetailYear, extractDetailDirector,
  extractDetailPoster, extractDetailName,
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
    return multiName.split('/').map(name => removeLF(name).trim()).join(' / ');
  },
  name: (content) => {
    const multiName = extractRoughName(content);
    return removeLF(multiName.split('/')[0].trim());
  },
  tags: (content) => extractTags(content).map(tag => removeLF(tag)).filter(tag => tag.indexOf('标签') === -1),
};

const carveDetailInfo = {
  name: (content) => removeLF(extractDetailName(content)),
  poster: (content) => {
    const posterURL = extractDetailPoster(content);
    return removeLF(posterURL);
  },
  year: (content) => removeLF(extractDetailYear(content)),
  director: (content) => extractDetailDirector(content).map(director => removeLF(director)),
};

const getRoughInfo = (content) => {
  const id = carveRoughInfo.id(content);
  const url = carveRoughInfo.href(content);
  const name = carveRoughInfo.name(content);
  const multiName = carveRoughInfo.multiName(content);
  const tags = carveRoughInfo.tags(content);
  const posterURL = carveRoughInfo.poster(content);
  return {
    id, url, posterURL, name, multiName, tags,
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
      yearError: true,
      directorError: true,
      posterError: true,
    };
  }

  const content = await getText(info.url);

  const posterURL = carveDetailInfo.poster(content);
  const year = carveDetailInfo.year(content);
  const director = carveDetailInfo.director(content);

  let imgInfo = { width: 0, height: 0, color: 'white' };
  try {
    imgInfo = await getPosterInfo(posterURL || info.posterURL);
  } catch (e) {
    console.error(e);
  }

  const checkStringLegal = (str) => str && str !== '';
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
    tags: _.cloneDeep(info.tags),
    multiName: info.multiName,
    posterError: !checkStringLegal(posterURL) && !checkStringLegal(info.posterURL)
    && imgInfo.width > 0 && imgInfo.height > 0,
    yearError: !checkStringLegal(year),
    directorError: !director || director.length === 0,
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
    res.director = (newObj.director && newObj.director.length) ? _.cloneDeep(newObj.director) : _.cloneDeep(oldObj.director);
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
  getDetailInfo, mergeObject, removeLF, concurrentGetDetailInfo,
};
