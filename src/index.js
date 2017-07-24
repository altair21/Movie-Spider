import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

import { get } from './http';
import { getDuration } from './timeutil';

let total = -1;

// const getPoster = (url) => new Promise((resolve, reject) => {

// });

const getInfo = url => new Promise((resolve, reject) => {
  get(url).then((res) => {
    const $ = cheerio.load(res);
    const ele1 = $('#wrapper #content h1 span')[0];
    const ele2 = $('#wrapper #content .article #mainpic a img')[0];
    let name = '';
    let posterURL = '';
    if (ele1) {
      name = ele1.children[0].data;
    }
    if (ele2) {
      posterURL = ele2.attribs.src;
    }
    resolve({ name, posterURL });
  }).catch(reject);
});

const getInfos = urlsPromise => new Promise((resolve, reject) => {
  const res = urlsPromise.then(urls => urls.reduce((promise, url) => {
    let ret = [];
    return promise.then((infos) => {
      ret = infos;
      return getInfo(url);
    }).then((info) => {
      ret.push(info);
      return ret;
    });
  }, Promise.resolve([]))).catch(reject);
  res.then(resolve);
});

const getURLs = (id, offset) => new Promise((resolve, reject) => {
  get(`https://movie.douban.com/people/${id}/collect`, {
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
  }).catch(reject);
});

const main = (startTime) => {
  const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'config.json'), 'utf8'));
  get(`https://movie.douban.com/people/${config.id}/`).then((content) => {
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
    infos = infos.filter(v => v.name !== '' && v.posterURL !== ''); // eslint-disable-line no-param-reassign
    const outputPath = path.join(__dirname, '..', 'output');
    if (!fs.existsSync(outputPath)) {
      fs.mkdirSync(outputPath);
    }
    fs.writeFileSync(path.join(outputPath, 'output.json'), JSON.stringify(infos), 'utf8');
    console.log(`爬取成功，耗时：${getDuration(startTime)}`);
  }).catch((e) => {
    console.error(`爬取失败：${e.message}，耗时：${getDuration(startTime)}`);
  });
};

main(new Date());
