import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { getText } from '../src/util/';
import { mergeObject } from '../src/basehelper';
import { checkProperty } from '../src/util/text';
import { getDetailInfoExceptAward } from '../src/nightmare/nightmarecommon';
import { cookieMgr } from '../src/cookiemgr';

const url = 'https://movie.douban.com/subject/1294240/';

const doAnalyze = async () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const configPath = path.join(__dirname, '..', 'config.json');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));
  const infoIndex = _.findIndex(origin, (o) => url.endsWith(o.url));
  cookieMgr.setCookie(config.cookie);

  if (infoIndex === -1) {
    console.log('没有找到对应此 url 的数据');
    process.exit(0);
  }

  const newInfo = await getDetailInfoExceptAward(origin[infoIndex], await getText(url));
  const resInfo = mergeObject(origin[infoIndex], newInfo).newObject;
  origin[infoIndex] = resInfo;
  fs.writeFileSync(fullOutputPath, JSON.stringify(origin), 'utf8');
  console.log(`${resInfo.name} 修改成功！`);

  const checked = checkProperty(resInfo, config.ignoreTags);
  console.log(checked.errorMessages.join('\n'));
};

doAnalyze().then(() => { });
