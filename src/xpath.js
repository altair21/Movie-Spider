import cheerio from 'cheerio';

import ErrorMessage from './preset/errormessage';
import { ScoreDefinition } from './preset/valueDef';

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

const extractRoughTags = (content) => {
  const $ = cheerio.load(content);
  const tagEle = $('.info span.tags')[0];
  if (tagEle) return $(tagEle).text().split(' ') || [];
  return [];
};

const extractRoughUserScore = (content) => {
  const $ = cheerio.load(content);
  const spans = $('.info span');
  let res = ScoreDefinition.GetFailure;
  if (spans) {
    spans.each((index, element) => {
      const className = $(element).attr('class');
      if (className.startsWith('rating')) {
        res = +className.substr(6, 1);
        if (isNaN(res)) res = ScoreDefinition.NoScore;
      }
    });
  }
  return res;
};

const extractRoughUserComment = (content) => {
  const $ = cheerio.load(content);
  const commentEle = $('.info .comment')[0];
  if (commentEle && commentEle.children[0]) return commentEle.children[0].data || '';
  return '';
};

const extractRoughCommentLikes = (content) => {
  const $ = cheerio.load(content);
  const commentEle = $('.info .comment')[0];
  let res = 0;
  if (commentEle && commentEle.parent && commentEle.parent.children
    && commentEle.parent.children[3] && commentEle.parent.children[3].children[0]
    && commentEle.parent.children[3].children[0].data) {
    res = Number.parseInt(commentEle.parent.children[3].children[0].data.substr(1), 10);
    if (isNaN(res)) res = 0;
  }
  return res;
};

const extractRoughMarkDate = (content) => {
  const $ = cheerio.load(content);
  const markDateEle = $('.info .date')[0];
  if (markDateEle && markDateEle.children[0]) return markDateEle.children[0].data || '';
  return '';
};

const extractTotal = (content) => {
  const $ = cheerio.load(content);
  const element = $('#db-movie-mine h2 a')[0];
  if (element && element.children[0]) return element.children[0].data;
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

const extractDetailScore = (content) => {
  const $ = cheerio.load(content);
  const scoreEle = $('#wrapper #content #interest_sectl .rating_num')[0];
  let res = ScoreDefinition.GetFailure;
  if (scoreEle && scoreEle.children[0]) res = +scoreEle.children[0].data;
  if (isNaN(res)) res = ScoreDefinition.NoScore;
  return res;
};

const extractDetailNumOfScore = (content) => {
  const $ = cheerio.load(content);
  const element = $('#wrapper #content #interest_sectl .rating_sum span')[0];
  let res = ScoreDefinition.GetFailure;
  if (element && element.children[0]) res = +element.children[0].data;
  if (isNaN(res)) res = ScoreDefinition.NoScore;
  return res;
};

const extractDetailCategory = (content) => {
  const $ = cheerio.load(content);
  const elements = $('#wrapper #content #info span[property=v\\:genre]');
  const res = [];
  elements.each((index, element) => {
    if (element && element.children[0]) res.push(element.children[0].data);
  });
  return res;
};

const extractDetailRefFilms = (content) => {
  const $ = cheerio.load(content);
  const aEles = $('.recommendations-bd dl dd a');
  const imgEles = $('.recommendations-bd dl dt img');
  const aArr = aEles.map((index, aEle) => {
    if (!aEle || !aEle.children[0]) {
      return { id: null, name: null };
    }
    const href = aEle.attribs.href;
    const name = aEle.children[0].data;
    const hrefPart = href.replace('https://movie.douban.com/subject/', '')
                      .replace('http://movie.douban.com/subject/', '');
    const id = `${Number.parseInt(hrefPart, 10)}`;
    return { id, name };
  });

  const imgArr = imgEles.map((index, imgEle) => {
    if (!imgEle || !imgEle.children[0]) {
      return '';
    }
    return imgEle.attribs.src || '';
  });

  const res = [];
  for (let i = 0, l = aArr.length; i < l; i++) {
    res.push({ id: aArr[i].id, name: aArr[i].name, posterURL: imgArr[i] });
  }
  return res;
};

export {
  extractTotal, extractDetailURL, extractRoughName, extractRoughPoster,
  extractRoughTags, extractRoughInfos, extractDetailName, extractDetailPoster,
  extractDetailYear, extractDetailDirector, extractRoughUserScore,
  extractRoughUserComment, extractRoughCommentLikes, extractRoughMarkDate,
  extractDetailCategory, extractDetailScore, extractDetailNumOfScore,
  extractDetailRefFilms,
};
