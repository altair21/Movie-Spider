/* global document */
import fs from 'fs';
import path from 'path';
import puppeteer from 'puppeteer';

import {
  getTotal, genRoughInfos, filterKeywords, genDetailInfos, mergeResult,
  writeToDisk, genLogMessage, filterResult, mergeManualItem, finishResult,
  checkResult, sendToServer,
 } from '../helper';
import { config } from '../config';
import { cookieMgr } from '../cookiemgr';
import { initialState } from '../preset/prototype';
import { JSONPathToObject, getTodayDate } from '../util/';

const outputDir = path.join(__dirname, '..', '..', 'output');
const outputPath = path.join(outputDir, 'output.json');
const fullOutputPath = path.join(outputDir, 'full_output.json');
const manualPath = path.join(outputDir, 'manual.json');
const filterPath = path.join(outputDir, 'filter.json');

const getTextInPage = async (page, url, param = {}) => {
  const paramStr = Object.keys(param).map(key => `${key}=${param[key]}`).join('&');
  const seprator = paramStr.length > 0 ? '?' : '';
  const reqStr = `${url}${seprator}${paramStr}`;

  await page.goto(`https://movie.douban.com${reqStr}`);
  const htmlHandle = await page.evaluateHandle(() => document.body.innerHTML);
  const text = await htmlHandle.jsonValue();
  await htmlHandle.dispose();
  return text;
};

const main = async () => {
  try {
    const _initialState = {
      ...initialState,
      config,
      fullOutputPath,
      outputPath,
      origin: JSONPathToObject(fullOutputPath),
      manual: JSONPathToObject(manualPath),
      ruleoutItems: JSONPathToObject(filterPath),
      startTime: new Date(),
    };

    const browser = await puppeteer.launch({ slowMo: 1000 });
    const page = await browser.newPage();

    cookieMgr.setCookie(config.cookie);
    const keys = Object.getOwnPropertyNames(cookieMgr.cookie);
    const cookies = keys.map(key => ({
      name: key,
      value: cookieMgr.cookie[key],
      domain: 'movie.douban.com',
    }));
    await page.setCookie(...cookies);

    _initialState.getText = (url) => getTextInPage(page, url);
    await getTotal(_initialState)
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
        if (finalState.changes.length > 0) {
          const changesDir = path.join(__dirname, '..', '..', 'output', 'changes');
          const changesPath = path.join(changesDir, `${getTodayDate()}-changes.txt`);
          if (!fs.existsSync(changesDir)) {
            fs.mkdirSync(changesDir);
          }
          fs.writeFileSync(changesPath, finalState.changes.join('\n'), 'utf8');
          finalState.logs.push('\n检测到变化：');
          finalState.logs = finalState.logs.concat(finalState.changes); // eslint-disable-line no-param-reassign
        }
        console.log(finalState.logs.join('\n'));
      })
      .catch(e => {
        console.log('爬取失败：\n', e);
      });

    await browser.close();
  } catch (e) {
    console.log(`[main() error]: ${e}`);
  }
};

setInterval(() => {
  main().catch(console.log);
}, 24 * 60 * 60 * 1000);
main().catch(console.log);
