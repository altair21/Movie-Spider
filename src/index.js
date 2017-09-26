import fs from 'fs';
import path from 'path';
import 'babel-core/register'; // eslint-disable-line
import 'babel-polyfill';  // eslint-disable-line

import {
  getTotal, genRoughInfos, filterKeywords, genDetailInfos, mergeResult,
  writeToDisk, genLogMessage, filterResult, finishResult, checkResult,
  sendToServer,
} from './helper';
import { initialState } from './preset/prototype';

const main = () => {
  const outputDir = path.join(__dirname, '..', 'output');
  const fullOutputPath = path.join(outputDir, 'full_output.json');
  const outputPath = path.join(outputDir, 'output.json');
  const configPath = path.join(__dirname, '..', 'config.json');

  if (!fs.existsSync(configPath)) {
    console.log('没有找到配置文件');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const _initialState = {
    ...initialState,
    fullOutputPath,
    outputPath,
    config,
    startTime: new Date(),
  };

  getTotal(_initialState)
    .then(genRoughInfos)
    .then(filterKeywords)
    .then(genDetailInfos)
    .then(mergeResult)
    .then(filterResult)
    .then(finishResult)
    .then(writeToDisk)
    .then(sendToServer)
    .then(genLogMessage)
    .then(checkResult)
    .then(finalState => {
      console.log(finalState.logs.join('\n'));
    })
    .catch(e => {
      console.log('爬取失败：\n', e);
    });
};

setInterval(() => {
  main();
}, 24 * 60 * 60 * 1000);
main();
