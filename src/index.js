import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import sizeOf from 'image-size';
import getColors from 'get-image-colors';

import { getText, getBuffer, login } from './http';
import { getDuration } from './timeutil';
import { scp } from './scp';
import { textToObject, objectToText } from './text';

process.env.UV_THREADPOOL_SIZE = 128;

const outputPath = path.join(__dirname, '..', 'output');
const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));

let total = -1;
let actualTotal = 0;
let appendedItem = [];
let errorItem = [];

const getPosterInfo = url => new Promise((resolve, reject) => {
  if (url === '') {
    resolve({});
    return;
  }
  getBuffer(url).then((buffer) => {
    const imgInfo = sizeOf(buffer);
    // TODO: set MIME according to `imgInfo`
    getColors(buffer, 'image/jpeg').then((colors) => {
      resolve({ width: imgInfo.width, height: imgInfo.height, color: colors[0].hex() });
    }).on('error', e => reject(new Error(`海报颜色解析失败(${url}): ${e.message}`)));
  }).catch(e => reject(new Error(`获取海报信息失败(${url})：${e.message}`)));
});

const getInfo = url => new Promise((resolve, reject) => {
  let name = '';
  let posterURL = '';
  let year = '';
  if (!url) {
    resolve({ name, posterURL, year });
    return;
  }
  getText(url).then((res) => {
    const $ = cheerio.load(res);
    const ele1 = $('#wrapper #content h1 span')[0];
    const ele2 = $('#wrapper #content .article #mainpic a img')[0];
    const ele3 = $('#wrapper #content h1 span.year')[0];
    if (ele1) {
      name = ele1.children[0].data;
    }
    if (ele2) {
      posterURL = ele2.attribs.src;
    }
    if (ele3 && ele3.children[0] && ele3.children[0].data) {
      const len = ele3.children[0].data.length || 0;
      year = ele3.children[0].data.slice(1, len - 1);
    }
    return getPosterInfo(posterURL);
  }).then((info) => {
    resolve({ url, name, posterURL, year, w: info.width, h: info.height, color: info.color });
  }).catch(e => reject(new Error(`获取影片信息失败(${url})：${e.message}`)));
});

const filterKeywords = (content) => {
  const $ = cheerio.load(content);
  const resHref = [];
  const avaiIndex = [];
  $('#content .article .grid-view .item .info .title a').each((index, element) => {
    resHref.push(element.attribs.href);
  });

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
    return resHref;
  }

  const ret = [];
  for (let i = 0, l = avaiIndex.length; i < l; i++) {
    ret.push(resHref[avaiIndex[i]]);
  }
  return ret;
};

const getInfos = urlsPromise => new Promise((resolve, reject) => {
  const res = urlsPromise.then(urls => urls.reduce((promise, url) => {
    let ret = [];
    return promise.then((infos) => {
      ret = infos;
      return getInfo(url ? url.split('\n').join('').replace('https://movie.douban.com', '') : undefined);
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
  const outputFilePath = path.join(outputPath, 'output.json');
  let origin = [];
  if (fs.existsSync(outputFilePath)) {
    const text = fs.readFileSync(outputFilePath, 'utf8');
    origin = textToObject(text);
  }
  const res = origin.slice();
  for (let i = 0, l = appended.length; i < l; i++) {
    if (!res.find(item => item.url === appended[i].url || item.name === appended[i].name)) {
      appendedItem.push(appended[i].name);
      res.push(appended[i]);
    }
  }
  return res;
};

const initialize = () => {
  total = -1;
  actualTotal = 0;
  appendedItem = [];
  errorItem = [];
};

const gao = (startTime) => { // eslint-disable-line arrow-body-style
  initialize();
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
    const _infos = infos.filter(v => {
      if (v.url && (!v.name || !v.posterURL)) {
        errorItem.push({ url: v.url, name: v.name, posterURL: v.posterURL });
      }
      return v.name !== '' && v.posterURL !== '';
    });
    let res = mergeResult(_infos);
    actualTotal = res.length;
    if (config.shuffle) {
      res = res.sort(() => (Math.random() > 0.5 ? -1 : 1));
    }
    const outputFilePath = path.join(outputPath, 'output.json');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }
    if (config.outputAsJS) {
      fs.writeFileSync(outputFilePath, objectToText(res), 'utf8');
    } else {
      fs.writeFileSync(outputFilePath, JSON.stringify(res), 'utf8');
    }

    return scp(outputFilePath);
  }).then((flag) => {
    const scpStr = flag ? '\n结果文件已通过scp发送到目标服务器' : '';
    const appendedStr = appendedItem.length > 0 ? `新增 ${appendedItem.length} 部影片：\n${JSON.stringify(appendedItem)}` : '无新增影片';
    const errorStr = errorItem.length > 0 ? `有 ${errorItem.length} 部影片出错：\n${JSON.stringify(errorItem)}` : '';
    const str = `爬取成功：\n数量：${actualTotal}/${total}\n耗时：${getDuration(startTime)}${scpStr}\n\n${appendedStr}\n\n${errorStr}\n`;
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
