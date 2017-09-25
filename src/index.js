import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import _ from 'lodash';

import {
  getDuration,
  getText, login,
  scp,
  getPosterInfo, hdThumbPoster,
  objectToText, genOutput,
} from './util/';

process.env.UV_THREADPOOL_SIZE = 128;

const configPath = path.join(__dirname, '..', 'config.json');
const outputPath = path.join(__dirname, '..', 'output');
const fullOutputFilePath = path.join(outputPath, 'full_output.json');
const outputFilePath = path.join(outputPath, 'output.json');

if (!fs.existsSync(configPath)) {
  console.log('没有找到配置文件');
  process.exit(1);
}
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

let total = -1;
let actualTotal = 0;
let appendedItem = [];
let posterErrorItem = [];
let yearErrorItem = [];
let directorErrorItem = [];

const getInfo = obj => new Promise((resolve, reject) => {
  let name;
  let posterURL;
  let year;
  const director = [];
  if (!obj || !obj.url) {
    resolve({ name, posterURL, year, director });
    return;
  }
  getText(obj.url).then((res) => {
    const $ = cheerio.load(res);
    const nameEle = $('#wrapper #content h1 span')[0];
    const posterEle = $('#wrapper #content .article #mainpic a img')[0];
    const yearEle = $('#wrapper #content h1 span.year')[0];
    const directorEle = $('#wrapper #content #info span .attrs')[0];
    if (nameEle) {
      name = nameEle.children[0].data;
    }
    if (posterEle) {
      posterURL = posterEle.attribs.src;
    }
    if (yearEle && yearEle.children[0] && yearEle.children[0].data) {
      const len = yearEle.children[0].data.length || 0;
      year = yearEle.children[0].data.slice(1, len - 1);
    }
    if (directorEle) {
      const children = directorEle.children;
      for (let i = 0, l = children.length; i < l; i++) {
        if (children[i].type === 'tag') {
          director.push(children[i].children[0].data);
        }
      }
    }
    return getPosterInfo(posterURL || obj.posterURL || '');
  }).then((info) => {
    resolve({
      id: obj.url.match(/\d+/)[0],
      url: obj.url,
      name: name || obj.name || '',
      year: year || obj.year || '',
      director: _.cloneDeep(director),
      posterURL: posterURL || obj.posterURL || '',
      w: info.width || 0,
      h: info.height || 0,
      color: info.color || 'white',
      posterError: !posterURL && info.width === 65, // thumbnail width is 65
      yearError: !year,
      directorError: director.length === 0,
    });
  }).catch(e => reject(new Error(`获取影片信息失败(${obj.url})：${e.message}`)));
});

const filterKeywords = (content) => {
  const $ = cheerio.load(content);
  const resHref = [];
  const resName = [];
  const resPosterURL = [];
  const avaiIndex = [];
  const resObj = [];
  $('#content .article .grid-view .item .info .title a').each((index, element) => {
    resHref.push(element.attribs.href);
  });

  $('#content .article .grid-view .item .pic a img').each((index, element) => {
    resPosterURL.push(element.attribs.src);
  });

  $('#content .article .grid-view .item .info .title em').each((index, element) => {
    resName.push(element.children[0].data.replace(' /', ''));
  });

  for (let i = 0, l = resHref.length; i < l; i++) {
    resObj.push({
      url: resHref[i],
      name: resName[i],
      posterURL: hdThumbPoster(resPosterURL[i]),
      year: '',
    });
  }

  const tags = $('#content .article .grid-view .item .info span.tags');
  tags.each((index, element) => {
    const text = $(element).text();
    if (config.keywords && config.keywords.length > 0) {
      let flag = false;
      for (let i = 0, l = config.keywords.length; i < l; i++) {
        if (text.indexOf(config.keywords[i]) !== -1) {
          flag = true;
          break;
        }
      }
      if (flag) avaiIndex.push(index);
    } else {
      avaiIndex.push(index);
    }
  });

  if (!config.keywords || config.keywords.length < 1 || tags.length === 0) {
    return resObj;
  }

  const ret = [];
  for (let i = 0, l = avaiIndex.length; i < l; i++) {
    ret.push(resObj[avaiIndex[i]]);
  }
  return ret;
};

const getInfos = objsPromise => new Promise((resolve, reject) => {
  const res = objsPromise.then(objs => objs.reduce((promise, obj) => {
    let ret = [];
    return promise.then((infos) => {
      ret = infos;
      if (obj && obj.url) {
        obj.url = obj.url.split('\n').join('').replace('https://movie.douban.com', ''); // eslint-disable-line no-param-reassign
      }
      return getInfo(obj);
    }).then((info) => {
      ret.push(info);
      return ret;
    });
  }, Promise.resolve([]))).catch(reject);
  res.then(resolve);
});

const getURLs = (id, offset) => new Promise((resolve, reject) => {
  getText(`/people/${id}/collect`, {
    start: offset,
    sort: 'time',
    rating: 'all',
    filter: 'all',
    mode: 'grid',
  }).then((res) => {
    const ret = filterKeywords(res);
    resolve(ret);
  }).catch(e => reject(new Error(`获取影片列表失败：${e.message}`)));
});

const mergeResult = (appended = []) => {
  let origin = [];
  if (fs.existsSync(fullOutputFilePath)) {
    const text = fs.readFileSync(fullOutputFilePath, 'utf8');
    origin = JSON.parse(text);
  }
  const res = origin.slice();
  for (let i = 0, l = appended.length; i < l; i++) {
    if (_.isEmpty(appended[i]) || appended[i] == null) continue;  // eslint-disable-line no-continue
    const findIndex = _.findIndex(res, (item) => item.id === appended[i].id || item.url === appended[i].url || item.name === appended[i].name);
    if (findIndex === -1) {
      appendedItem.push(appended[i].name);
      res.push(appended[i]);
    } else {
      let findObj = res[findIndex];
      findObj = {
        id: appended[i].id || findObj.id,
        url: appended[i].url || findObj.url,
        name: appended[i].name || findObj.name,
        year: findObj.year,
        posterURL: findObj.posterURL,
        color: findObj.color,
        w: findObj.w,
        h: findObj.h,
        director: findObj.director,
        yearError: appended[i].yearError && findObj.yearError,
        posterError: appended[i].posterError && findObj.posterError,
        directorError: appended[i].directorError && findObj.directorError,
      };
      if (!appended[i].posterError) {
        findObj.posterURL = appended[i].posterURL || findObj.posterURL;
        findObj.w = appended[i].w || findObj.w;
        findObj.h = appended[i].h || findObj.h;
        findObj.color = appended[i].color || findObj.color;
      }
      if (!appended[i].yearError) {
        findObj.year = appended[i].year || findObj.year;
      }
      if (!appended[i].directorError) {
        findObj.director = appended[i].director || findObj.director;
      }
      res[findIndex] = findObj;
    }
  }
  return res;
};

const initialize = () => {
  total = -1;
  actualTotal = 0;
  appendedItem = [];
  posterErrorItem = [];
  yearErrorItem = [];
  directorErrorItem = [];
};

const gao = (startTime) => {
  initialize();
  let genOutputStr;
  return getText(`/people/${config.id}/`).then((content) => {
    const $ = cheerio.load(content);
    total = Number.parseInt($('#wrapper #content #db-movie-mine h2 a')[0].children[0].data, 10);
    let offset = 0;
    const offsets = [];
    while (offset < total) {
      offsets.push(offset);
      offset += 15;
    }
    const resPromise = offsets.reduce((promise, curOffset) => {
      let ret = [];
      return promise.then((urls) => {
        ret = urls;
        return getURLs(config.id, curOffset);
      }).then(urls => ret.concat(urls));
    }, Promise.resolve([]));
    return getInfos(resPromise);
  }).then((infos) => {
    let res = mergeResult(infos);
    res = res.filter(v => {
      if (v.url) {
        if (v.posterError) {
          posterErrorItem.push({ id: v.id, name: v.name });
        }
        if (v.yearError) {
          yearErrorItem.push({ id: v.id, name: v.name });
        }
        if (v.directorError) {
          directorErrorItem.push({ id: v.id, name: v.name });
        }
      }
      return !_.isEmpty(v) && v != null && v.name && v.url;
    });
    actualTotal = res.length;
    if (config.shuffle) {
      res = res.sort(() => (Math.random() > 0.5 ? -1 : 1));
    }
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }

    if (config.outputAsJS) {
      fs.writeFileSync(fullOutputFilePath, objectToText(res), 'utf8');
    } else {
      fs.writeFileSync(fullOutputFilePath, JSON.stringify(res), 'utf8');
    }
    genOutputStr = genOutput();

    return scp(outputFilePath);
  }).then((flag) => {
    const scpStr = flag ? '\n结果文件已通过scp发送到目标服务器' : '';
    const appendedStr = appendedItem.length > 0 ? `新增 ${appendedItem.length} 部影片：\n${JSON.stringify(appendedItem)}` : '无新增影片';
    const posterErrorStr = posterErrorItem.length > 0 ? `\n有 ${posterErrorItem.length} 部影片未获取到正确的海报：\n${JSON.stringify(posterErrorItem)}\n` : '';
    const yearErrorStr = yearErrorItem.length > 0 ? `\n有 ${yearErrorItem.length} 部影片未获取到正确年份：\n${JSON.stringify(yearErrorItem)}\n` : '';
    const directorErrorStr = directorErrorItem.length > 0 ? `\n有 ${directorErrorItem.length} 部影片未获取到正确导演：\n${JSON.stringify(directorErrorItem)}\n` : '';
    const fullGenStr = `\n自检模块：\n${genOutputStr}\n`;
    const str = `爬取成功：\n数量：${actualTotal}/${total}\n耗时：${getDuration(startTime)}${scpStr}\n\n${appendedStr}\n${posterErrorStr}${yearErrorStr}${directorErrorStr}${fullGenStr}`;
    console.log(str);
  })
  .catch((e) => {
    console.error(`爬取失败：\n${e.message}\n耗时：${getDuration(startTime)}`);
  });
};

const main = () => {
  login(config.username, config.password).then(() => gao(new Date()))
    .catch((err) => {
      console.log(err);
      gao(new Date());
    });
};

setInterval(() => {
  main();
}, 24 * 60 * 60 * 1000);
main();
