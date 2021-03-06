/* global document */
import fs from 'fs';
import path from 'path';
import Nightmare from 'nightmare';
import cheerio from 'cheerio';
import _ from 'lodash';

import { initialConfig } from '../preset/prototype';
import { checkProperty, getPosterInfo, getTodayDate, getDuration, mkdir, objectToTextPath, scp } from '../util/';
import { analyze } from './nightmarecommon';
import { getRoughInfos } from '../basehelper';
import { colored, Color, ColorType, stripColor } from '../logger/';
import { genOutputObject } from '../helper';

const configPath = path.join(__dirname, '..', '..', 'config.json');
const config = { ...initialConfig, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };

let currentPage = config.startPage;

const nightmareParams = {
  show: true,
//  switches: {
//    'proxy-server': 'socks5://127.0.0.1:1234',
//    'ignore-certificate-errors': true,
//  },
};

const targetId = `${config.id}`;
const ignoreTags = config.ignoreTags;
const logCheckResult = config.logCheckResult;
const keywords = config.keywords;

const startTime = new Date();
const todayDate = getTodayDate();

const newFilmColored = colored(ColorType.foreground)(Color.green);
const progressColored = colored(ColorType.foreground)(Color.cyan);
const statColored = (text) => colored(ColorType.background)(Color.blue)(colored(ColorType.foreground)(Color.black)(text));
const errorColored = colored(ColorType.foreground)(Color.red);

const hardFullOutputPath = path.join(__dirname, '..', '..', 'output', 'full_output.json');
const hardOutputPath = path.join(__dirname, '..', '..', 'output', 'output.json');
const fullOutputDir = path.join(__dirname, '..', '..', 'output', 'full', `${targetId}`);
const fullOutputPath = path.join(fullOutputDir, `${targetId}-${todayDate}-full_output.json`);
const ruleoutPath = path.join(__dirname, '..', '..', 'output', 'filter.json');
const ruleoutItems = fs.existsSync(ruleoutPath) ? JSON.parse(fs.readFileSync(ruleoutPath, 'utf8')) : [];
const origin = fs.existsSync(hardFullOutputPath) ? JSON.parse(fs.readFileSync(hardFullOutputPath, 'utf8')) : [];
const nightmareConfig = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'nightmare-config.json'), 'utf8'));
let res = [];
let statLen = (currentPage - 1) * 15;

mkdir(fullOutputDir);

const extractFilmName = async (content) => {
  const $ = cheerio.load(content);

  const resObj = await getRoughInfos(content).reduce((promise, obj) =>
    promise.then(async (arr) => {
      try {
        const imgInfo = await getPosterInfo(obj.posterURL);
        // FIXME: imgInfo 应该是一体的
        return arr.concat([{ ...obj, w: imgInfo.width || 0, h: imgInfo.height || 0, color: imgInfo.color || 'white', posterError: false }]);
      } catch (e) {
        console.log(errorColored(`获取海报信息失败(${obj.posterURL})：${e}`));
        const findObj = _.find(origin, (o) => o.id === obj.id);
        if (findObj) {
          return arr.concat([{ ...obj, w: findObj.w || 0, h: findObj.h || 0, color: findObj.color || 'white', posterError: findObj.posterError }]);
        }
        return arr.concat([{ ...obj }]);
      }
    }), Promise.resolve([]));

  res = res.concat((!keywords || keywords.length === 0) ? resObj :
    resObj.filter(obj => _.find((obj.tags || []),
      (tag) => _.find((keywords || []),
        (keyword) => keyword === tag)))); // 过滤关键字之外的内容
  console.log(progressColored(`[进度] 第 ${currentPage++} 页提取完成（${res.length} 部），开始解析……`));
  const element = $('.next a')[0];
  const hasNext = !!element;
  const href = hasNext ? element.attribs.href : '';
  return { hasNext, href };
};

const sendToServer = async () => {
  try {
    console.log('\n', statColored('开始生成结果并发送给目标服务器'));
    const _origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));
    const outputObj = genOutputObject(_.shuffle(_origin));
    objectToTextPath(outputObj, hardOutputPath);
    await scp(hardOutputPath, config.ssh);
    console.log(statColored(`已发送到目标服务器：${config.ssh.host}:${config.ssh.path}`));
  } catch (e) {
    console.log(errorColored(`sendToServer() error: ${e}`));
  }
};

const writeResult = (newOrigin) => {
  fs.writeFileSync(fullOutputPath, JSON.stringify(newOrigin), 'utf8');
  return 0;
};

const initialize = () => {
  res = [];
};

const analyzeAll = (nightmare, url) => {
  nightmare
  .goto(url)
  .wait('.nav-user-account')
  .evaluate(() => document.body.innerHTML)
  .then(async (content) => {
    const { hasNext, href } = await extractFilmName(content);
    const arr = _.range(res.length);
    let allMessages = [];

    // TODO: 输出新增影片
    // const newItems = [];
    await arr.reduce((promise, index) =>
      promise.then(async (ret) => {
        if (res[index].isManual
          || _.find(ruleoutItems, (ruleoutItem) =>  // 手动过滤项不需要进入详细页
            (ruleoutItem.url && res[index].url && ruleoutItem.url === res[index].url)
            || (ruleoutItem.id && res[index].id && ruleoutItem.id === res[index].id))) {
          return ret.concat([res[index]]);
        }
        const findIndex = _.findIndex(origin, (o) => o.id === res[index].id);
        const newAnalyzed = await analyze(nightmare, `https://movie.douban.com${res[index].url}`, res[index], findIndex !== -1 ? origin[findIndex] : undefined, ++statLen);
        const newInfo = newAnalyzed.resInfo;
        if (findIndex !== -1 && newAnalyzed.messages.length !== 0) {
          console.log(newAnalyzed.messages.map(str => `[更新] ${str}`).join('\n'));
          allMessages = allMessages.concat(newAnalyzed.messages.map(stripColor));
        } else if (findIndex === -1) {
          console.log(newFilmColored(`[新增影片] ${newInfo.name}（${(newInfo.director.map(o => o.name) || []).join('、')}, ${newInfo.year}）`));
        }

        if (logCheckResult) {
          const checked = checkProperty(newInfo, ignoreTags);
          if (checked.errorMessages.length !== 0) {
            console.log(errorColored(checked.errorMessages.map(str => `[检测] ${str}`).join('\n')));
          }
        }
        if (findIndex === -1) {
          origin.push(newInfo);
        } else {
          origin[findIndex] = newInfo;
        }
        writeResult(origin);
        return ret.concat([newInfo]);
      }), Promise.resolve([]));

    const changesDir = path.join(__dirname, '..', '..', 'output', 'changes', `${targetId}`);
    const changesPath = path.join(changesDir, `${targetId}-${todayDate}-changes.txt`);
    if (!fs.existsSync(changesDir)) {
      fs.mkdirSync(changesDir);
    }
    if (allMessages.length > 0) {
      let preContent = '';
      if (fs.existsSync(changesPath)) {
        preContent = fs.readFileSync(changesPath, 'utf8');
      }
      fs.writeFileSync(changesPath, `${preContent}\n${allMessages.join('\n')}`, 'utf8');
    }

    const origin2 = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
    .filter(obj => !_.find(ruleoutItems, (ruleoutItem) =>
    (ruleoutItem.url && obj.url && ruleoutItem.url === obj.url)
    || (ruleoutItem.id && obj.id && ruleoutItem.id === obj.id))); // 过滤手动排除的内容
    fs.writeFileSync(fullOutputPath, JSON.stringify(origin2), 'utf8');
    fs.writeFileSync(hardFullOutputPath, JSON.stringify(origin2), 'utf8');

    if (!hasNext) {
      nightmare.end().then(() => console.log(statColored('[进度] nightmare 实例已释放！')));
      const len = (JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
        .filter(obj => !_.find(ruleoutItems, (ruleoutItem) =>
          (ruleoutItem.url && obj.url && ruleoutItem.url === obj.url)
          || (ruleoutItem.id && obj.id && ruleoutItem.id === obj.id)))).length;
      console.log(statColored(`[统计] 本次分析 ${statLen} 部，总计 ${len} 部，再接再厉！`));
      console.log(statColored(`[统计] 运行时间：${getDuration(startTime)}`));
      await sendToServer();
      return 0;
    }
    res = [];
    return analyzeAll(nightmare, `https://movie.douban.com${href}`);
  })
  .catch((error) => {
    console.log(errorColored('[nightmare do error]: ', error));
  });
};

const main = () => {
  initialize();

  const nightmare = Nightmare(nightmareParams);

  nightmare
    .goto('https://accounts.douban.com/passport/login') // 登录页
    .click('.account-tab-account')
    .type('#username', nightmareConfig.username)
    .type('#password', nightmareConfig.password)
    .click('.btn-account')
    .wait(10000)
    .goto('https://movie.douban.com/mine?status=collect') // 看过的电影

    .evaluate(() => document.body.innerHTML)
    // .then(() => analyzeAll(nightmare, `https://movie.douban.com/people/${targetId}/collect`))
    .then(() => analyzeAll(nightmare, `https://movie.douban.com/people/${targetId}/collect?start=${(currentPage - 1) * 15}&sort=time&rating=all&filter=all&mode=grid`))
    .catch((error) => {
      console.log(errorColored('[nightmare error]: ', error));
    });
};

main();
