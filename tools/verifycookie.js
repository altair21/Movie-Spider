import fs from 'fs';
import path from 'path';
import cheerio from 'cheerio';

import { cookieMgr } from '../src/cookiemgr';
import { getText } from '../src/util/httputil';
import { extractDetailYear } from '../src/xpath';

const removeLF = (str) => str.split('\n').join('');

const extractInfo = async (cookie = '') => {
  cookieMgr.setCookie(cookie);
  const content = await getText('/subject/1295929/'); // 王超《安阳婴儿》
  const $ = cheerio.load(content);
  const year = removeLF(extractDetailYear($));
  if (!year || year === '') return false;
  return true;
};

const doVerify = async () => {
  const configPath = path.join(__dirname, '..', 'config.json');
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  if (!config.cookie) {
    console.log('没有设置 Cookie!');
    process.exit(-1);
  }

  const reqWithCookie = await extractInfo(config.cookie);
  const reqWithoutCookie = await extractInfo();

  if (reqWithoutCookie) {
    console.log('看样子这个 url 可以正常访问了，换一个吧！');
    process.exit(-1);
  } else if (reqWithCookie) {
    console.log('Cookie 有效！');
    process.exit(0);
  } else {
    console.log('Cookie 无效！');
    process.exit(-1);
  }
};

doVerify().then(() => { });
