import _ from 'lodash';

import {
  getText, objectToJSONPath, JSONPathToObject,
  checkProperty, objectToTextPath, scp, getDuration,
} from './util/';
import { extractTotal } from './xpath';
import { genOffsetStep15, getURLs, getDetailInfo, mergeObject } from './basehelper';

const getTotal = async (state) => {
  const content = await getText(`/people/${state.config.id}/`);
  const element = extractTotal(content);
  return {
    ...state,
    total: Number.parseInt(element.children[0].data, 10),
  };
};

const genRoughInfos = async (state) => {
  const offsets = genOffsetStep15(state.total);

  const res = await offsets.reduce((promise, curOffset) =>
    (promise.then(async arr =>
      arr.concat(await getURLs(state.config.id, curOffset)))),
    Promise.resolve([]));
  return {
    ...state,
    infos: res,
  };
};

const filterKeywords = (state) => ({
  ...state,
  infos: state.config.keywords ? state.infos.filter(info =>
    (() =>
      info.tags.reduce((flag, tag) =>
        state.config.keywords.indexOf(tag) !== -1 || flag
      , false))(),
  ) : state.infos,
});

const genDetailInfos = async (state) => ({
  ...state,
  infos: await Promise.all(state.infos.map(async (info) => {
    const ret = await getDetailInfo(info);
    return ret;
  })),
});

const mergeResult = (state) => {
  const appendedItem = [];
  const origin = JSONPathToObject(state.fullOutputPath);

  const res = _.cloneDeep(origin);

  state.infos.forEach(info => {
    const isItemEqual = (item) => item.id === info.id || item.url === info.url || item.multiName === info.multiName;
    const findIndex = _.findIndex(res, isItemEqual);
    if (findIndex === -1) {
      appendedItem.push(info.name);
      console.log('add')
      res.push(info);
    } else {
      console.log('merge')
      res[findIndex] = mergeObject(res[findIndex], info);
      console.log(res[findIndex]);
    }
  });

  return {
    ...state,
    appendedItem,
    infos: res,
  };
};

const filterResult = (state) => {
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
    actualTotal: res.length,
    infos: res,
    errorItem,
  };
};

const finishResult = (state) => {
  let res = _.cloneDeep(state.infos);
  if (state.config.shuffle) {
    res = res.sort(() => (Math.random() > 0.5 ? -1 : 1));
  }

  return {
    ...state,
    infos: res,
  };
};

const writeToDisk = (state) => {
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

const sendToServer = async (state) => {
  await scp(state.outputPath, state.config.ssh);
  return state;
};

const genLogMessage = (state) => {
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

const checkResult = (state) => {
  let flag = true;
  let emptyObjFlag = false;
  let logs = [];

  logs.push('自检模块：');
  state.infos.forEach(info => {
    if (_.isEmpty(info)) {
      emptyObjFlag = true;
      flag = false;
    }
    if (!info.year || info.yearError || info.year === '') {
      logs.push(`${info.name} 年份信息出错  ${info.url}`);
      flag = false;
    }
    if (!info.director || info.directorError || info.director.length === 0) {
      logs.push(`${info.name} 导演信息出错  ${info.url}`);
      flag = false;
    }

    const checked = checkProperty(info);
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
  filterResult, finishResult, writeToDisk, genLogMessage, checkResult,
  sendToServer,
};
