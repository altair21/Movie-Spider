import _ from 'lodash';
import cheerio from 'cheerio';

import {
  getText, objectToJSONPath, JSONPathToObject,
  checkProperty, objectToTextPath, scp, getDuration,
} from './util/';
import { extractTotal } from './xpath';
import {
  genOffsetStep15, getURLs, concurrentGetDetailInfo, mergeObject,
} from './basehelper';
import { initialState } from './preset/prototype';

const getTotal = async (state = initialState) => {
  const content = await getText(`/people/${state.config.id}/`);
  const totalStr = extractTotal(cheerio.load(content));
  return {
    ...state,
    total: Number.parseInt(totalStr, 10),
  };
};

const genRoughInfos = async (state = initialState) => {
  const offsets = genOffsetStep15(state.total);

  const res = await offsets.reduce((promise, curOffset) =>
    promise.then(async arr =>
      arr.concat(await getURLs(state.config.id, curOffset))),
    Promise.resolve([]));
  return {
    ...state,
    infos: res,
  };
};

const filterKeywords = (state = initialState) => ({
  ...state,
  infos: state.config.keywords ? state.infos.filter(info =>
    (() => info.tags.reduce((flag, tag) =>
      state.config.keywords.indexOf(tag) !== -1 || flag
    , false))(),
  ) : state.infos,
});

const genDetailInfos = async (state = initialState) => ({
  ...state,
  infos: await _.chunk(state.infos.filter(info =>
    !_.find(state.ruleoutItems, (ruleoutItem) => ruleoutItem.url === info.url || ruleoutItem.id === info.id)),
    state.config.concurrency || 1)
    .reduce((promise, infoArr) =>
      promise.then(async arr =>
        arr.concat(await concurrentGetDetailInfo(infoArr))),
      Promise.resolve([])),
});

const mergeResult = (state = initialState) => {
  const appendedItem = [];
  const origin = JSONPathToObject(state.fullOutputPath);

  const res = _.cloneDeep(origin);
  let changes = [];

  state.infos.filter(info => info.id && info.id !== '').forEach(info => {
    const isItemEqual = (item) => item.id === info.id || item.url === info.url;
    const findIndex = _.findIndex(res, isItemEqual);
    if (findIndex === -1) {
      appendedItem.push({ name: info.name, id: info.id });
      res.push(info);
    } else {
      const merged = mergeObject(res[findIndex], info);
      res[findIndex] = merged.newObject;
      changes = merged.messages;
    }
  });

  return {
    ...state,
    appendedItem,
    infos: res,
    changes,
  };
};

const filterResult = (state = initialState) => {
  const errorItem = {
    poster: [],
    year: [],
    director: [],
  };
  const res = state.infos.filter(info => {
    if (_.isEmpty(info) || info == null || !info.name || !info.id) return false;
    if (info.posterError) {
      errorItem.poster.push({ id: info.id, name: info.name });
    }
    if (info.yearError) {
      errorItem.year.push({ id: info.id, name: info.name });
    }
    if (info.directorError) {
      errorItem.director.push({ id: info.id, name: info.name });
    }
    return true;
  });

  return {
    ...state,
    infos: res,
    errorItem,
  };
};

const mergeManualItem = (state = initialState) => {
  const manualItem = JSONPathToObject(state.manualPath);

  return {
    ...state,
    infos: state.infos.concat(manualItem),
  };
};

const finishResult = (state = initialState) => {
  let res = _.cloneDeep(state.infos);
  if (state.config.shuffle) {
    res = res.sort(() => (Math.random() > 0.5 ? -1 : 1));
  }

  return {
    ...state,
    actualTotal: res.length,
    infos: res,
  };
};

const writeToDisk = (state = initialState) => {
  objectToJSONPath(state.infos, state.fullOutputPath);

  const simpleInfos = state.infos.map(_info => {
    const info = _.clone(_info);
    delete info.id;
    delete info.url;
    delete info.director;
    delete info.tags;
    delete info.multiName;
    delete info.posterError;
    delete info.yearError;
    delete info.directorError;
    return info;
  });

  if (state.config.outputAsJS) {
    objectToTextPath(simpleInfos, state.outputPath);
  } else {
    objectToJSONPath(simpleInfos, state.outputPath);
  }
  return state;
};

const sendToServer = async (state = initialState) => {
  await scp(state.outputPath, state.config.ssh);
  return state;
};

const genLogMessage = (state = initialState) => {
  const logs = [];
  logs.push('爬取成功：');
  logs.push(`数量：${state.actualTotal}/${state.total}`);
  logs.push(`耗时：${getDuration(state.startTime)}`);
  logs.push('结果文件已通过 scp 发送到目标服务器\n');
  if (state.appendedItem.length > 0) {
    logs.push(`新增 ${state.appendedItem.length} 部影片：\n${JSON.stringify(state.appendedItem)}\n`);
  } else {
    logs.push('无新增影片\n');
  }
  if (state.errorItem.poster.length > 0) {
    logs.push(`有 ${state.errorItem.poster.length} 部影片未获取到正确的海报：\n${JSON.stringify(state.errorItem.poster)}\n`);
  }
  if (state.errorItem.year.length > 0) {
    logs.push(`有 ${state.errorItem.year.length} 部影片未获取到正确的年份：\n${JSON.stringify(state.errorItem.year)}\n`);
  }
  if (state.errorItem.director.length > 0) {
    logs.push(`有 ${state.errorItem.director.length} 部影片未获取到正确的导演：\n${JSON.stringify(state.errorItem.director)}\n`);
  }

  return {
    ...state,
    logs: state.logs.concat(logs),
  };
};

const checkResult = (state = initialState) => {
  let flag = true;
  let emptyObjFlag = false;
  let logs = [];

  logs.push('自检模块：');
  state.infos.forEach(info => {
    if (_.isEmpty(info)) {
      emptyObjFlag = true;
      flag = false;
    }

    const checked = checkProperty(info, state.config);
    logs = logs.concat(checked.errorMessages);
    flag = flag && checked.isCorrect;
  });

  if (emptyObjFlag) logs.push('\n存在空的条目\n');
  if (flag) logs.push(`没有发现异常，共 ${state.infos.length} 项`);

  return {
    ...state,
    logs: state.logs.concat(logs),
  };
};

export {
  getTotal, genRoughInfos, filterKeywords, genDetailInfos, mergeResult,
  filterResult, mergeManualItem, finishResult, writeToDisk, genLogMessage,
  checkResult, sendToServer,
};
