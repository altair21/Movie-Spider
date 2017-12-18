import sizeOf from 'image-size';
import getColors from 'get-image-colors';

import { getBuffer } from './httputil';
import { removeLF } from '../basehelper';

const getPosterInfo = (url) => new Promise((resolve, reject) => {
  if (!url || url === '') {
    resolve({});
    return;
  }
  const _url = removeLF(url);
  getBuffer(_url, true).then((buffer) => {  // 最近解析 https 经常 hang up，试试 http。 -- 2017.12.18
    const imgInfo = sizeOf(buffer);
    // TODO: set MIME according to `imgInfo`
    getColors(buffer, 'image/jpeg').then((colors) => {
      resolve({ width: imgInfo.width, height: imgInfo.height, color: colors[0].hex() });
    }).on('error', e => reject(new Error(`海报颜色解析失败(${_url}): ${e.message}`)));
  }).catch(e => reject(new Error(`获取海报信息失败(${_url})：${e.message}`)));
});

const hdThumbPoster = (url) => {
  if (typeof url === 'string' &&
    url.match(/https:\/\/img[1-9].doubanio.com\/view\/movie_poster_cover\/ipst\/public/)) {
    return url.replace('ipst', 'lpst');
  }
  return url;
};

export { getPosterInfo, hdThumbPoster };
