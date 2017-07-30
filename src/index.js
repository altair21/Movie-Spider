import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';
import sizeOf from 'image-size';
import getColors from 'get-image-colors';

import { getText, getBuffer } from './http';
import { getDuration } from './timeutil';
import { scp } from './scp';

process.env.UV_THREADPOOL_SIZE = 128;

const outputPath = path.join(__dirname, '..', 'output');

let total = -1;
let actualTotal = 0;

const getPosterInfo = url => new Promise((resolve, reject) => {
  if (url === '') {
    resolve({});
    return;
  }
  getBuffer(url).then((buffer) => {
    const imgInfo = sizeOf(buffer);
    // TODO: set MIME according to `imgInfo`
    getColors(buffer, 'image/jpeg').then((colors) => {
      actualTotal++;
      resolve({ width: imgInfo.width, height: imgInfo.height, color: colors[0].hex() });
    }).on('error', e => reject(new Error(`海报颜色解析失败(${url}): ${e.message}`)));
  }).catch(e => reject(new Error(`获取海报信息失败(${url})：${e.message}`)));
});

const getInfo = url => new Promise((resolve, reject) => {
  let name = '';
  let posterURL = '';
  if (!url) {
    resolve({ name, posterURL });
    return;
  }
  getText(url).then((res) => {
    const $ = cheerio.load(res);
    const ele1 = $('#wrapper #content h1 span')[0];
    const ele2 = $('#wrapper #content .article #mainpic a img')[0];
    if (ele1) {
      name = ele1.children[0].data;
    }
    if (ele2) {
      posterURL = ele2.attribs.src;
    }
    return getPosterInfo(posterURL);
  }).then((info) => {
    resolve({ name, posterURL, w: info.width, h: info.height, color: info.color });
  }).catch(e => reject(new Error(`获取影片信息失败(${url})：${e.message}`)));
});

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
    const $ = cheerio.load(res);
    const ret = [];
    $('#content .article .grid-view .item .info .title a').each((index, element) => {
      ret.push(element.attribs.href);
    });
    resolve(ret);
  }).catch(e => reject(new Error(`获取影片列表失败：${e.message}`)));
});

const main = (startTime) => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
  getText(`/people/${config.id}/`).then((content) => {
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
    let _infos = infos.filter(v => v.name !== '' && v.posterURL !== '');
    if (config.shuffle) {
      _infos = _infos.sort(() => (Math.random() > 0.5 ? -1 : 1));
    }
    const outputFilePath = path.join(outputPath, 'output.json');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }
    if (config.outputAsJS) {
      fs.writeFileSync(outputFilePath, `let data = '${JSON.stringify(_infos).split('\'').join('\\\'')}'`, 'utf8');
    } else {
      fs.writeFileSync(outputFilePath, JSON.stringify(_infos), 'utf8');
    }

    return scp(outputFilePath);
  }).then((flag) => {
    const scpStr = flag ? '\n结果文件已通过scp发送到目标服务器' : '';
    const str = `爬取成功：\n数量：${actualTotal}/${total}\n耗时：${getDuration(startTime)}${scpStr}`;
    console.log(str);
    actualTotal = 0;
  })
  .catch((e) => {
    console.error(`爬取失败：\n${e.message}\n耗时：${getDuration(startTime)}`);
    actualTotal = 0;
  });
};

main(new Date());
