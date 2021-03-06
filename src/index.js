import fs from 'fs';
import path from 'path';
import 'babel-core/register'; // eslint-disable-line
import 'babel-polyfill';  // eslint-disable-line

import {
  getTotal, genRoughInfos, filterKeywords, genDetailInfos, mergeResult,
  writeToDisk, genLogMessage, filterResult, mergeManualItem, finishResult,
  checkResult, sendToServer,
} from './helper';
import { getTodayDate, getText, JSONPathToObject } from './util/';
import { initialState } from './preset/prototype';
import { cookieMgr } from './cookiemgr';

const main = () => {
  const outputDir = path.join(__dirname, '..', 'output');
  const fullOutputPath = path.join(outputDir, 'full_output.json');
  const outputPath = path.join(outputDir, 'output.json');
  const configPath = path.join(__dirname, '..', 'config.json');
  const manualPath = path.join(outputDir, 'manual.json');
  const filterPath = path.join(outputDir, 'filter.json');

  if (!fs.existsSync(configPath)) {
    console.log('没有找到配置文件');
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const _initialState = {
    ...initialState,
    fullOutputPath,
    outputPath,
    ruleoutItems: JSONPathToObject(filterPath),
    origin: JSONPathToObject(fullOutputPath),
    manual: JSONPathToObject(manualPath),
    config,
    startTime: new Date(),
    getText,
  };
  cookieMgr.setCookie(config.cookie);

  getTotal(_initialState)
    .then(genRoughInfos)
    .then(filterKeywords)
    .then(genDetailInfos)
    .then(mergeResult)
    .then(filterResult)
    .then(mergeManualItem)
    .then(finishResult)
    .then(writeToDisk)
    .then(sendToServer)
    .then(genLogMessage)
    .then(checkResult)
    .then(finalState => {
      if (finalState.changes) {
        const changesDir = path.join(__dirname, '..', 'output', 'changes');
        const changesPath = path.join(changesDir, `${getTodayDate()}-changes.txt`);
        if (!fs.existsSync(changesDir)) {
          fs.mkdirSync(changesDir);
        }
        fs.writeFileSync(changesPath, finalState.changes.join('\n'), 'utf8');
        // console.log(finalState.changes.join('\n'));
      }
      console.log(finalState.logs.join('\n'));
    })
    .catch(e => {
      console.log('爬取失败：\n', e);
    });
};

setInterval(() => {
  main();
}, 7 * 24 * 60 * 60 * 1000);
main();
