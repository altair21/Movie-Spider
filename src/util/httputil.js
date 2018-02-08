import https from 'https';
import URL from 'url';

import { cookieMgr } from '../cookiemgr';

const hostname = 'movie.douban.com';

const login = (username, password) => new Promise((resolve, reject) => {
  if (!username || !password) {
    resolve();
    return;
  }

  const postBody = JSON.stringify({
    form_email: username,
    form_password: password,
  });

  const option = {
    hostname: 'accounts.douban.com',
    path: '/login',
    method: 'POST',
    timeout: 60 * 1000,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postBody),
    },
  };

  const request = https.request(option, (res) => {
    const ret = [];
    res.on('data', (data) => {
      ret.push(data);
    });
    res.on('end', () => resolve(Buffer.concat(ret)));
    res.on('error', e => reject(new Error(`登录失败！\n${e.message}`)));
  }).on('error', e => reject(new Error(`登录失败！\n${e.message}`)));
  request.write(postBody);
  request.end();
});

const getText = (url, param = {}) => new Promise((resolve, reject) => {
  const paramStr = Object.keys(param).map(key => `${key}=${param[key]}`).join('&');
  const seprator = paramStr.length > 0 ? '?' : '';
  const reqStr = `${url}${seprator}${paramStr}`;

  const option = {
    hostname,
    path: reqStr,
    method: 'GET',
    timeout: 60 * 1000,
    headers: {
      'User-Agent': 'Mozilla/5.0 (X11; Linux i686) AppleWebKit/537.11 (KHTML, like Gecko) Chrome/23.0.1271.64 Safari/537.11',
      Accept: '/',
      Connection: 'keep-alive',
      Cookie: cookieMgr.getCookie(),
    },
  };

  https.get(option, (res) => {
    if (res.headers['set-cookie']) {
      cookieMgr.updateCookie(res.headers['set-cookie'][0]);
    }
    const ret = [];
    res.on('data', (data) => {
      ret.push(data);
    });
    res.on('end', () => resolve(ret.join('\n')));
    res.on('error', e => reject(new Error(`url: ${url}\n${e.message}`)));
  }).on('error', e => reject(new Error(`url ${url}\n${e.message}`)));
});

const getBuffer = url => new Promise((resolve, reject) => {
  https.get(URL.parse(url), (response) => {
    const chunks = [];
    response.on('data', (chunk) => {
      chunks.push(chunk);
    }).on('end', () => resolve(Buffer.concat(chunks)))
      .on('error', e => reject(new Error(`url: ${url}\n${e.message}`)));
  }).on('error', e => reject(new Error(`url ${url}\n${e.message}`)));
});

export { login, getText, getBuffer };
