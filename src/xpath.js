import cheerio from 'cheerio';
import _ from 'lodash';
import ErrorMessage from './preset/errormessage';
import { ScoreDefinition } from './preset/valueDef';

const extractDetailURL = ($) => {
  const urlEle = $('.info .title a')[0];
  if (urlEle) return urlEle.attribs.href || '';
  return '';
};

const extractRoughPoster = ($) => {
  const posterEle = $('.pic a img')[0];
  if (posterEle) return posterEle.attribs.src || '';
  return '';
};

// FIXME: 更完整的名字，如港译、台译在 em 标签之外
const extractRoughName = ($) => {
  const nameEle = $('.info .title em')[0];
  if (nameEle && nameEle.children[0]) return nameEle.children[0].data || '';
  return '';
};

const extractRoughTags = ($) => {
  const tagEle = $('.info span.tags')[0];
  if (tagEle) return $(tagEle).text().split(' ') || [];
  return [];
};

const extractRoughUserScore = ($) => {
  const spans = $('.info span');
  let res = ScoreDefinition.GetFailure;
  if (spans) {
    spans.each((index, element) => {
      const className = $(element).attr('class');
      if (className && className.startsWith('rating')) {
        res = +className.substr(6, 1);
        if (isNaN(res)) res = ScoreDefinition.NoScore;
      }
    });
  }
  return res;
};

const extractRoughUserComment = ($) => {
  const commentEle = $('.info .comment')[0];
  if (commentEle && commentEle.children[0]) return commentEle.children[0].data || '';
  return '';
};

const extractRoughCommentLikes = ($) => {
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

const extractRoughMarkDate = ($) => {
  const markDateEle = $('.info .date')[0];
  if (markDateEle && markDateEle.children[0]) return markDateEle.children[0].data || '';
  return '';
};

const extractTotal = ($) => {
  const element = $('#db-movie-mine h2 a')[0];
  if (element && element.children[0]) return element.children[0].data;
  throw new Error(ErrorMessage.total);
};

const extractRoughInfos = ($) => {
  const element = $('#content .article .grid-view .item');
  if (element) return element.toArray();
  throw new Error(ErrorMessage.roughInfo);
};

const extractDetailName = ($) => {
  const nameEle = $('#wrapper #content h1 span')[0];
  if (nameEle && nameEle.children[0]) return nameEle.children[0].data || '';
  return '';
};

const extractDetailPoster = ($) => {
  const posterEle = $('#wrapper #content .article #mainpic a img')[0];
  if (posterEle) return posterEle.attribs.src || '';
  return '';
};

const extractDetailYear = ($) => {
  const yearEle = $('#wrapper #content h1 span.year')[0];
  if (yearEle && yearEle.children[0] && yearEle.children[0].data) {
    const len = yearEle.children[0].data.length || 0;
    return yearEle.children[0].data.slice(1, len - 1) || '';
  }
  return '';
};

const extractDetailDirector = ($) => {
  const elements = $('#wrapper #content #info a[rel=v\\:directedBy]');
  const res = [];
  elements.each((index, element) => {
    if (element && element.children[0]) {
      if (element.attribs.href && element.attribs.href.indexOf('celebrity') !== -1) {
        res.push({
          id: element.attribs.href.slice(11, -1),
          name: element.children[0].data,
        });
      } else {
        res.push({
          id: '',
          name: element.children[0].data,
        });
      }
    }
  });
  return res;
};

const extractDetailWriter = ($) => {
  const elements = $('#info span');
  const res = [];
  elements.each((index, element) => {
    if (element && element.children[0] && typeof element.children[0].data === 'string'
      && element.children[0].data.startsWith('编剧') && element.next.data
      && element.next.next && element.next.next.children) {
      element.next.next.children.forEach(ele => {
        if (!ele.data && ele.children && ele.children[0]) {
          if (ele.attribs.href && ele.attribs.href.indexOf('celebrity') !== -1) {
            res.push({
              id: ele.attribs.href.slice(11, -1),
              name: ele.children[0].data,
            });
          } else {
            res.push({
              id: '',
              name: element.children[0].data,
            });
          }
        }
      });
    }
  });
  return res;
};

const extractDetailActor = ($) => {
  const elements = $('#info a[rel=v\\:starring]');
  const res = [];
  elements.each((index, element) => {
    if (element && element.children[0]) {
      if (element.attribs.href && element.attribs.href.indexOf('celebrity') !== -1) {
        res.push({
          id: element.attribs.href.slice(11, -1),
          name: element.children[0].data,
        });
      } else {
        res.push({
          id: '',
          name: element.children[0].data,
        });
      }
    }
  });
  return res;
};

const extractDetailScore = ($) => {
  const scoreEle = $('#wrapper #content #interest_sectl .rating_num')[0];
  let res = ScoreDefinition.GetFailure;
  if (scoreEle && scoreEle.children[0]) res = +scoreEle.children[0].data;
  if (isNaN(res)) res = ScoreDefinition.NoScore;
  return res;
};

const extractDetailNumOfScore = ($) => {
  const element = $('#wrapper #content #interest_sectl .rating_sum span')[0];
  let res = ScoreDefinition.GetFailure;
  if (element && element.children[0]) res = +element.children[0].data;
  if (isNaN(res)) res = ScoreDefinition.NoScore;
  return res;
};

const extractDetailCategory = ($) => {
  const elements = $('#wrapper #content #info span[property=v\\:genre]');
  const res = [];
  elements.each((index, element) => {
    if (element && element.children[0]) res.push(element.children[0].data);
  });
  return res;
};

const extractDetailCountry = ($) => {
  const elements = $('#info span');
  let res = [];
  elements.each((index, element) => {
    if (element && element.children[0] && typeof element.children[0].data === 'string'
      && element.children[0].data.startsWith('制片国家/地区') && element.next.data) {
      res = res.concat(element.next.data.split('/').map(c => (c || '').trim()));
    }
  });
  return res;
};

const extractDetailRuntime = ($) => {
  const element = $('#info span[property=v\\:runtime]')[0];
  let res = [];
  if (element == null) {
    const elements = $('#info span');
    elements.each((index, ele) => {
      if (ele && ele.children[0] && typeof ele.children[0].data === 'string'
        && ele.children[0].data.startsWith('片长')) {
        res.push((ele.next.data || '').trim());
      }
    });
    return res;
  }

  if (element && element.children[0]) res.push(element.children[0].data || '');
  if (element && element.children[0] && typeof element.children[0].data === 'string' && element.next.data) {
    res = res.concat(element.next.data.split(' / ').map(c => (c || '').trim()).slice(1));
  }
  return res;
};

const extractDetailClassify = ($) => {
  const elements = $('#info span');
  const episodeEle = $('#content .episode_list');
  if (episodeEle.length > 0) return 'teleplay';

  let isTeleplay = false;
  elements.each((index, element) => {
    if (element && element.children[0] && typeof element.children[0].data === 'string'
      && (element.children[0].data.startsWith('首播')
        || element.children[0].data.startsWith('集数')
        || element.children[0].data.startsWith('季数')
        || element.children[0].data.startsWith('单集片长'))) isTeleplay = true;
  });
  if (isTeleplay) {
    return 'teleplay';
  }
  return 'film';
};

const extractDetailReleaseDate = ($) => {
  const elements = $('#info span[property=v\\:initialReleaseDate]');
  const res = [];
  elements.each((index, element) => {
    if (element && element.children[0]) res.push((element.children[0].data || '').trim());
  });
  return res;
};

const extractDetailNumberOfWatched = ($) => {
  const elements = $('.subject-others-interests-ft a');
  let res = 0;
  elements.each((index, element) => {
    if (element && element.children[0] && element.children[0].data
      && element.children[0].data.indexOf('看过') !== -1) {
      res = Number.parseInt(element.children[0].data, 10);
    }
  });
  return res;
};

const extractDetailNumberOfWanted = ($) => {
  const elements = $('.subject-others-interests-ft a');
  let res = 0;
  elements.each((index, element) => {
    if (element && element.children[0] && element.children[0].data
      && element.children[0].data.indexOf('想看') !== -1) {
      res = Number.parseInt(element.children[0].data, 10);
    }
  });
  return res;
};

const extractDetailFriendsScore = ($) => {
  const element = $('.friends_rating_wrap .rating_avg')[0];
  if (element && element.children[0] && element.children[0].data) return +element.children[0].data;
  return 0;
};

const extractDetailSynopsis = ($) => {
  const elements = $('.related-info span[property=v\\:summary]');
  if (elements && elements[0]) {
    const element = elements[0];
    if (element && element.children[0] && element.children[0].data) {
      return element.children[0].data.trim();
    }
  }
  return '';
};

const extractDetailFriendsNoS = ($) => {  // Friends Number of Score
  const element = $('.friends_rating_wrap .friends_count')[0];
  if (element && element.children[0] && element.children[0].data) return Number.parseInt(element.children[0].data, 10);
  return 0;
};

const extractDetailRefFilms = ($) => {
  const aEles = $('.recommendations-bd dl dd a');
  const res = _.map(aEles, (aEle) => {
    if (!aEle || !aEle.children[0]) {
      return { id: null, name: null };
    }
    const href = aEle.attribs.href || '';
    const name = aEle.children[0].data;
    const hrefPart = href.replace('https://movie.douban.com/subject/', '')
      .replace('http://movie.douban.com/subject/', '');
    const id = `${Number.parseInt(hrefPart, 10)}`;
    return { id, name };
  });

  return res;
};

const hasAwards = ($) => {
  const modEle = $('.mod .hd a')[0];
  if (modEle && modEle.children[0]) {
    return true;
  }
  return false;
};

const extractDetailAwards = ($) => {
  const awards = $('.awards');
  const res = [];

  const extractAward = ($$) => {
    const obj = { name: 'GetCeremonyNameFailed', year: 'GetYearFailed', awards: [] };
    const nameEle = $$('.hd h2 a')[0];
    const yearEle = $$('.hd h2 span')[0];
    const awardEle = $$('.award');
    if (nameEle && nameEle.children[0]) obj.name = nameEle.children[0].data || obj.name;
    if (yearEle && yearEle.children[0] && yearEle.children[0].data) {
      const year = yearEle.children[0].data;
      obj.year = +year.trim().substr(1, 4);
    }
    awardEle.each((index, element) => {
      const liEle = $$(element).children('li');
      const award = { name: 'GetAwardNameFailure', honoree: [] };
      liEle.each((idx, li) => {
        if (idx === 0) {
          if (li && li.children[0]) award.name = li.children[0].data || award.name;
        } else {
          const honoreeEle = $$(li).children('a');
          honoreeEle.each((id, aEle) => {
            if (aEle && aEle.children[0] && aEle.children[0].data) {
              award.honoree.push(aEle.children[0].data);
            }
          });
        }
      });
      obj.awards.push(award);
    });
    res.push(obj);
  };
  awards.each((index, element) => {
    const $$ = cheerio.load($(element).html());
    extractAward($$);
  });
  return res;
};

export {
  extractTotal, extractDetailURL, extractRoughName, extractRoughPoster,
  extractRoughTags, extractRoughInfos, extractDetailName, extractDetailPoster,
  extractDetailYear, extractDetailDirector, extractDetailWriter, extractRoughUserScore,
  extractRoughUserComment, extractRoughCommentLikes, extractRoughMarkDate,
  extractDetailCategory, extractDetailScore, extractDetailNumOfScore,
  extractDetailRefFilms, extractDetailCountry, extractDetailReleaseDate,
  extractDetailNumberOfWatched, extractDetailNumberOfWanted,
  extractDetailFriendsScore, extractDetailFriendsNoS, extractDetailSynopsis,
  extractDetailAwards, hasAwards, extractDetailRuntime, extractDetailActor,
  extractDetailClassify,
};
