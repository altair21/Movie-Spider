import fs from 'fs';
import sizeOf from 'image-size';
import getColors from 'get-image-colors';
import webp from 'webp-converter';

import { getBuffer } from './httputil';
import { removeLF } from '../basehelper';
import { Color, ColorType, colored } from '../logger/';
import { NodeEnvDefinition } from '../preset/valueDef';

const retryColored = colored(ColorType.foreground)(Color.magenta);
const retryTimes = 10;

// support 'webp' 'png' 'jpg'
// 登录的情况下看到的图片是 webp，不登录看到的是 png，有意思
const getPosterInfo = (url, times = 0) => Promise.race([new Promise((resolve) => {
  if (!url || url === '') {
    resolve({});
    return;
  }
  const _url = removeLF(url);
  getBuffer(_url).then((buffer) => {
    const imgInfo = sizeOf(buffer);

    if (_url.endsWith('.webp')) {
      const tmpWebpPath = 'tmp_image.webp';
      const tmpPngPath = 'tmp_output.png';
      fs.writeFileSync(tmpWebpPath, buffer);
      webp.dwebp(tmpWebpPath, tmpPngPath, '-o', () => {
        getColors(tmpPngPath).then((colors) => {
          resolve({ width: imgInfo.width, height: imgInfo.height, color: colors[0].hex() });
          fs.unlinkSync(tmpWebpPath);
          fs.unlinkSync(tmpPngPath);
        });
      });
      return;
    }

    getColors(buffer, 'image/jpeg').then((colors) => {
      resolve({ width: imgInfo.width, height: imgInfo.height, color: colors[0].hex() });
    }).catch(e => {
      if (times >= retryTimes) {
        return Promise.reject(new Error(`海报颜色解析失败(${_url}): ${e.message}`));
      }
      if (process.env.NODE_ENV === NodeEnvDefinition.development) {
        console.log(retryColored(`${url} 请求失败，开始重试，当前尝试次数：${times + 1}\n${e}`));
      }
      return getPosterInfo(url, times + 1);
    });
  }).catch(e => {
    if (times >= retryTimes) {
      return Promise.reject(new Error(`获取海报信息失败(${_url})：${e.message}`));
    }
    if (process.env.NODE_ENV === NodeEnvDefinition.development) {
      console.log(retryColored(`${url} 请求失败，开始重试，当前尝试次数：${times + 1}\n${e}`));
    }
    return getPosterInfo(url, times + 1);
  });
}), new Promise((resolve, reject) => {
  const id = setTimeout(() => {
    clearTimeout(id);
    reject(`${url} timeout`);
  }, 10000);
})]);

const hdThumbPoster = (url) => {
  if (typeof url === 'string' &&
    url.match(/https:\/\/img[1-9].doubanio.com\/view\/movie_poster_cover\/ipst\/public/)) {
    return url.replace('ipst', 'lpst');
  }
  return url;
};

export { getPosterInfo, hdThumbPoster };
