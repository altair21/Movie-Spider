import cheerio from 'cheerio';

import ErrorMessage from './preset/errormessage';

// TODO: 参数传 $ ，不要传 content，可以减少几次解析 HTML 的时间

const extractDetailURL = (content) => {
  const $ = cheerio.load(content);
  const urlEle = $('.info .title a')[0];
  if (urlEle) return urlEle.attribs.href || '';
  return '';
};

const extractRoughPoster = (content) => {
  const $ = cheerio.load(content);
  const posterEle = $('.pic a img')[0];
  if (posterEle) return posterEle.attribs.src || '';
  return '';
};

// FIXME: 更完整的名字，如港译、台译在 em 标签之外
const extractRoughName = (content) => {
  const $ = cheerio.load(content);
  const nameEle = $('.info .title em')[0];
  if (nameEle && nameEle.children[0]) return nameEle.children[0].data || '';
  return '';
};

const extractTags = (content) => {
  const $ = cheerio.load(content);
  const tagEle = $('.info span.tags')[0];
  if (tagEle) return $(tagEle).text().split(' ') || [];
  return [];
};

const extractTotal = (content) => {
  const $ = cheerio.load(content);
  const element = $('#db-movie-mine h2 a')[0];
  if (element) return element;
  throw new Error(ErrorMessage.total);
};

const extractRoughInfos = (content) => {
  const $ = cheerio.load(content);
  const element = $('#content .article .grid-view .item');
  if (element) return element.toArray();
  throw new Error(ErrorMessage.roughInfo);
};

const extractDetailName = (content) => {
  const $ = cheerio.load(content);
  const nameEle = $('#wrapper #content h1 span')[0];
  if (nameEle && nameEle.children[0]) return nameEle.children[0].data || '';
  return '';
};

const extractDetailPoster = (content) => {
  const $ = cheerio.load(content);
  const posterEle = $('#wrapper #content .article #mainpic a img')[0];
  if (posterEle) return posterEle.attribs.src || '';
  return '';
};

const extractDetailYear = (content) => {
  const $ = cheerio.load(content);
  const yearEle = $('#wrapper #content h1 span.year')[0];
  if (yearEle && yearEle.children[0] && yearEle.children[0].data) {
    const len = yearEle.children[0].data.length || 0;
    return yearEle.children[0].data.slice(1, len - 1) || '';
  }
  return '';
};

const extractDetailDirector = (content) => {
  const $ = cheerio.load(content);
  const directorEle = $('#wrapper #content #info span .attrs')[0];
  if (directorEle) {
    const director = [];
    const children = directorEle.children;
    for (let i = 0, l = children.length; i < l; i++) {
      if (children[i].type === 'tag') {
        director.push(children[i].children[0].data);
      }
    }
    return director;
  }
  return [];
};

export {
  extractTotal, extractDetailURL, extractRoughName, extractRoughPoster,
  extractTags, extractRoughInfos, extractDetailName, extractDetailPoster,
  extractDetailYear, extractDetailDirector,
};
