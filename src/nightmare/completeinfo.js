/* global document */
import fs from 'fs';
import path from 'path';
import Nightmare from 'nightmare';
import _ from 'lodash';

import { checkProperty } from '../util/text';
import { analyze } from './nightmarecommon';

const fullOutputPath = path.join(__dirname, '..', '..', 'output', 'full_output.json');
const configPath = path.join(__dirname, '..', '..', 'config.json');
const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const nightmareConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'nightmare-config.json'), 'utf8'));

const writeResult = (newOrigin) => {
  fs.writeFileSync(fullOutputPath, JSON.stringify(newOrigin), 'utf8');
  // console.log('输出文件更新完成！');
  return 0;
};

const main = async () => {
  const nightmare = Nightmare({ show: true });
  let total = 0;

  try {
    await nightmare
      .goto('https://www.douban.com/accounts/login?source=movie')
      .type('#email', nightmareConfig.username)
      .type('#password', nightmareConfig.password)
      .click('.btn-submit')
      .wait('.nav-user-account')
      .evaluate(() => document.body.innerHTML)
      .then(async () => {
        const arr = _.range(origin.length);
        const newOrigin = arr.reduce((promise, index) =>
          promise.then(async (res) => {
            if (origin[index].categoryError === false || origin[index].isManual) {
              return res.concat([origin[index]]);
            }
            const newInfo = await analyze(nightmare, `https://movie.douban.com${origin[index].url}`, origin[index]);
            const checked = checkProperty(newInfo, config);
            if (checked.errorMessages.length === 0) {
              console.log(`=: ${newInfo.name} 补充完成！`);
            } else {
              console.log(checked.errorMessages.join('\n'));
            }
            total++;
            origin[index] = newInfo;  // 替换原数据
            writeResult(origin);
            return res.concat([newInfo]);
          }), Promise.resolve([]));
        return newOrigin;
      })
      // .then(writeResult)
      .then(() => console.log(`一共更新 ${total} 项`))
      .catch(console.log);
  } catch (e) {
    console.log('[nightmare error]: ', e);
  }
};

main();
