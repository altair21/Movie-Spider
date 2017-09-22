/* global document */
import fs from 'fs';
import path from 'path';
import Nightmare from 'nightmare';
import cheerio from 'cheerio';
import _ from 'lodash';

import { hdThumbPoster } from './util/';

const config = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'nightmare-config.json'), 'utf8'));
let res = [];

const extractFilmName = (content) => {
  const $ = cheerio.load(content);
  const resHref = [];
  const resPosterURL = [];
  const resName = [];
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
    const hdPosterURL = hdThumbPoster(resPosterURL[i]);
    resObj.push({
      url: resHref[i],
      name: resName[i],
      poster: hdPosterURL,
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
    res = res.concat(resObj);
    return !!$('.next a')[0];
  }

  const ret = [];
  for (let i = 0, l = avaiIndex.length; i < l; i++) {
    ret.push(resObj[avaiIndex[i]]);
  }
  res = res.concat(ret);
  return !!$('.next a')[0];
};

const writeResult = () => {
  const fileDir = path.join(__dirname, '..', 'output');
  const filePath = path.join(fileDir, 'all.json');
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir);
  }
  fs.writeFileSync(filePath, JSON.stringify(_.uniq(res)), 'utf8');
};

const initialize = () => {
  res = [];
};

const nightmareDo = (nightmare) => {
  nightmare
    .click('.next a')
    .wait('.nav-user-account')
    .evaluate(() => document.body.innerHTML)
    .then((content) => {
      const flag = extractFilmName(content);
      if (flag) {
        nightmareDo(nightmare);
      } else {
        writeResult();
      }
    })
    .catch((error) => {
      console.log('[nightmare do error]: ', error);
    });
};

const main = () => {
  initialize();

  const nightmare = Nightmare({ show: true });

  nightmare
    .goto('https://www.douban.com/accounts/login?source=movie')
    .type('#email', config.username)
    .type('#password', config.password)
    .click('.btn-submit')
    .wait('.nav-user-account')

    .goto('https://movie.douban.com/mine?status=collect')
    .wait('.nav-user-account')
    .evaluate(() => document.body.innerHTML)
    .then((content) => {
      const flag = extractFilmName(content);
      if (flag) {
        nightmareDo(nightmare);
      } else {
        writeResult();
      }
    })
    .catch((error) => {
      console.error('[nightmare error]: ', error);
    });
};

main();
