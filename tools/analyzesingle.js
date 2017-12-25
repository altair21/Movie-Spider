import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { mergeObject } from '../src/basehelper';
import { checkProperty } from '../src/util/text';
import { getDetailInfoExceptPoster } from '../src/nightmare/completeinfo';

const url = 'https://movie.douban.com/subject/1294240/';

const doAnalyze = async () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const htmlPath = path.join(__dirname, '..', 'output', 'htmlcontent.txt');
  const configPath = path.join(__dirname, '..', 'config.json');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));
  const infoIndex = _.findIndex(origin, (o) => url.endsWith(o.url));
  if (infoIndex === -1) {
    console.log('没有找到对应此 url 的数据');
    process.exit(0);
  }

  const newInfo = await getDetailInfoExceptPoster(origin[infoIndex], fs.readFileSync(htmlPath, 'utf8'));
  const resInfo = mergeObject(origin[infoIndex], newInfo);
  origin[infoIndex] = resInfo;
  fs.writeFileSync(fullOutputPath, JSON.stringify(origin), 'utf8');
  console.log(`${resInfo.name} 修改成功！`);

  const checked = checkProperty(resInfo, config);
  console.log(checked.errorMessages.join('\n'));
};

doAnalyze().then(() => { });
