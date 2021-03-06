import _ from 'lodash';
import cheerio from 'cheerio';

import {
  objectToJSONPath, checkProperty, objectToTextPath, scp, getDuration, PropertyPreset,
} from './util/';
import { extractTotal } from './xpath';
import {
  genOffsetStep15, concurrentGetDetailInfo, mergeObject, getRoughInfos,
} from './basehelper';
import { colored, Color, ColorType } from './logger';
import { initialState } from './preset/prototype';
import { NodeEnvDefinition } from './preset/valueDef';

const errorColored = colored(ColorType.foreground)(Color.red);
const progressColored = colored(ColorType.foreground)(Color.cyan);

const getTotal = async (state = initialState) => {
  const content = await state.getText(`/people/${state.config.id}/`);
  const totalStr = extractTotal(cheerio.load(content));
  return {
    ...state,
    total: Number.parseInt(totalStr, 10),
  };
};

const genRoughInfos = async (state = initialState) => {
  const offsets = genOffsetStep15(Math.min(state.total, 30)); // FIXME: 最多更新30条，是为了增量更新，一周正常看片的话很难超过30部，这种姿势也能 work，但将来得改为正常姿势。

  const res = await offsets.reduce((promise, curOffset, index) =>
    promise.then(async arr => {
      // await sleep(Math.random() * 1500 + 1500); // IP 保护
      const content = await state.getText(`/people/${state.config.id}/collect`, {
        start: curOffset,
        sort: 'time',
        rating: 'all',
        filter: 'all',
        mode: 'grid',
      });
      if (process.env.NODE_ENV === NodeEnvDefinition.development) {
        console.log(progressColored(`[进度] ${index + 1} 完成`));
      }
      return arr.concat(getRoughInfos(content));
    }), Promise.resolve([]));
  if (process.env.NODE_ENV === NodeEnvDefinition.development) {
    console.log(progressColored('[进度] 简要信息提取完毕'));
  }
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

const genDetailInfos = async (state = initialState) => {
  let _404Times = 0;
  let logs = [];
  const infos = await _.chunk(state.infos.filter(info =>
    !_.find(state.ruleoutItems, (ruleoutItem) => ruleoutItem.url === info.url || ruleoutItem.id === info.id)),
    state.config.concurrency || 1)
    .reduce((promise, infoArr) =>
      promise.then(async arr => {
        const data = await concurrentGetDetailInfo(infoArr, state.getText, arr.length + 1);
        data.forEach(obj => {
          const result = checkProperty(obj);
          if (result.isCorrect) _404Times = 0;
          else _404Times++;
          logs = logs.concat(result.errorMessages);
          if (process.env.NODE_ENV === NodeEnvDefinition.development && !result.isCorrect) {
            console.log(errorColored(result.errorMessages.join('\n')));
          }
        });
        if (_404Times > 10) {
          throw new Error('无法继续执行爬虫，需要手动检验是否 IP 被封、账号被锁');
        }
        return arr.concat(data);
      }), Promise.resolve([]));
  return {
    ...state,
    infos,
    errorMessages: logs,
  };
};

const mergeResult = (state = initialState) => {
  const appendedItem = [];

  const res = _.cloneDeep(state.origin);
  let changes = [];

  state.infos.filter(info => info.id && info.id !== '').forEach(info => {
    const isItemEqual = (item) => item.id === info.id || item.url === info.url;
    const findIndex = _.findIndex(res, isItemEqual);
    if (findIndex === -1) {
      appendedItem.push({ name: info.name, year: info.year, director: info.director.map(o => o.name) });
      res.push(info);
    } else {
      const merged = mergeObject(res[findIndex], info);
      res[findIndex] = merged.newObject;
      changes = changes.concat(merged.messages);
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
  const res = state.infos.filter(info => {
    if (_.isEmpty(info) || info == null || !info.name || !info.id) return false;
    return true;
  });

  return {
    ...state,
    infos: res,
  };
};

const mergeManualItem = (state = initialState) =>
  ({
    ...state,
    infos: state.infos.concat(state.manual),
  });

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

const genOutputObject = (origin, logError = true) => {
  const _origin = origin.filter((obj) => {
    if (obj.isManual) return true;
    if (obj.classify === 'teleplay') return false;
    if (obj.category.indexOf('短片') !== -1) return false;
    if (obj.category.indexOf('真人秀') !== -1 || obj.category.indexOf('脱口秀') !== -1) return false;
    return true;
  });

  _origin.forEach(obj => {
    const res = checkProperty(obj);
    if (!res.isCorrect && logError) {
      console.log(res.errorMessages.join('\n'));
    }
  });

  const deleteProperty = (obj) => {
    if (obj.isManual) return obj;
    const res = obj;
    PropertyPreset.forEach(property => {
      if (!property.retainForOutput) {
        delete res[property.name];
      } else if (property.name === 'director') {
        res[property.name] = (obj.director || []).map(d => d.name);
      }
    });
    return res;
  };

  return _origin.map(deleteProperty);
};

const writeToDisk = (state = initialState) => {
  objectToJSONPath(state.infos, state.fullOutputPath);

  const simpleInfos = genOutputObject(state.infos, false);
  if (state.config.outputAsJS) {
    objectToTextPath(simpleInfos, state.outputPath);
  } else {
    objectToJSONPath(simpleInfos, state.outputPath);
  }
  return state;
};

const sendToServer = async (state = initialState) => {
  let sent = true;
  try {
    await scp(state.outputPath, state.config.ssh);
  } catch (e) {
    state.logs.push(`sendToServer() error: ${e}`);
    sent = false;
  }
  return {
    ...state,
    sent,
  };
};

const genLogMessage = (state = initialState) => {
  const logs = [];
  logs.push('爬取成功：');
  logs.push(`数量：${state.actualTotal}/(${state.total} + ${state.manual.length})`);
  logs.push(`耗时：${getDuration(state.startTime)}`);
  if (state.sent) logs.push('结果文件已通过 scp 发送到目标服务器\n');
  if (state.appendedItem.length > 0) {
    logs.push(`新增 ${state.appendedItem.length} 部影片：\n${state.appendedItem.map(obj =>
      `《${obj.name}》(${(obj.director || []).join('、')}, ${obj.year})`).join('\n')}\n`);
  } else {
    logs.push('无新增影片\n');
  }

  return {
    ...state,
    logs: state.logs.concat(logs),
  };
};

const checkResult = (state = initialState) => {
  let flag = true;
  let emptyObjFlag = false;
  const logs = [];

  logs.push('自检模块：');
  state.infos.forEach(info => {
    if (_.isEmpty(info)) {
      emptyObjFlag = true;
      flag = false;
    }
  });

  if (emptyObjFlag) logs.push('\n存在空的条目\n');
  if (flag && state.errorMessages.length === 0) {
    logs.push(`没有发现异常，共 ${state.infos.length} 项`);
  }

  return {
    ...state,
    logs: state.logs.concat(logs).concat(state.errorMessages),
  };
};

export {
  getTotal, genRoughInfos, filterKeywords, genDetailInfos, mergeResult,
  filterResult, mergeManualItem, finishResult, writeToDisk, genLogMessage,
  checkResult, sendToServer, genOutputObject,
};
