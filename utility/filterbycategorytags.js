import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const SortMode = {
  userScore: 'userScore',
  score: 'score',
  markDate: 'markDate',
};
const Order = {
  ascending: 1,
  descending: 2,
};
const Logical = {
  or: 'or',
  join: 'join',
};

const filterCategory = false;
const filterTag = true;
const keywords = {
  category: ['爱情'],
  tags: ['台湾', '爱情'],
};
const sortMode = SortMode.score;
const order = Order.descending;
const logical = Logical.join;

const originPath = path.join(__dirname, '..', 'output', 'full_output.json');
const outputPath = path.join(__dirname, `filterd${filterCategory ? `-category-${keywords.category.join('-')}` : ''}${filterCategory && filterTag ? `-${logical}` : ''}${filterTag ? `-tags-${keywords.tags.join('-')}` : ''}.txt`);

(async () => {
  let origin = JSON.parse(fs.readFileSync(originPath, 'utf8'))
    .filter(o => !o.isManual && o.classify === 'film' && !_.isNull(o[sortMode]))
    .map(o => ({ ...o, director: o.director.map(d => d.name) }));
  if (filterCategory) {
    origin = origin.filter(obj => _.isArray(obj.category));
  }
  if (filterTag) {
    origin = origin.filter(obj => _.isArray(obj.tags));
  }
  let res = [];

  origin.forEach(obj => {
    const categoryFlag = keywords.category.reduce((flag, keyword) => flag && _.find(obj.category, (c) => c === keyword), true);
    const tagsFlag = keywords.tags.reduce((flag, keyword) => flag && _.find(obj.tags, (c) => c === keyword), true);
    if (filterCategory && filterTag) {
      if (logical === Logical.or && (categoryFlag || tagsFlag)) {
        res.push(obj);
      }
      if (logical === Logical.join && (categoryFlag && tagsFlag)) {
        res.push(obj);
      }
    } else if (filterCategory) {
      if (categoryFlag) res.push(obj);
    } else if (filterTag) {
      if (tagsFlag) res.push(obj);
    } else {
      res.push(obj);
    }
  });

  if (sortMode === SortMode.score || sortMode === SortMode.userScore) {
    res = res.sort((a, b) => {
      if (a[sortMode] === b[sortMode]) {
        return a.name < b.name;
      }
      if (order === Order.ascending) {
        return a[sortMode] - b[sortMode];
      }
      return b[sortMode] - a[sortMode];
    });
  } else if (sortMode === SortMode.markDate) {
    res = res.sort((a, b) => {
      const year = (str) => str.substr(0, 4);
      const month = (str) => str.substr(5, 2);
      const day = (str) => str.substr(8, 2);
      const retWrapper = (func) => {
        if (a[sortMode] === b[sortMode]) {
          return a.name < b.name;
        }
        if (order === Order.ascending) {
          return func(a[sortMode]) - func(b[sortMode]);
        }
        return func(b[sortMode]) - func(a[sortMode]);
      };
      if (year(a[sortMode]) === year(b[sortMode])) {
        if (month(a[sortMode]) === month(b[sortMode])) {
          return retWrapper(day);
        }
        return retWrapper(month);
      }
      return retWrapper(year);
    });
  }

  const text = res.map((obj, index) => `${index + 1}. 《${obj.name}》（${obj.director.join('\n')} 执导，${obj.year}） ${sortMode}: ${obj[sortMode]}`);
  fs.writeFileSync(outputPath, text.join('\n'), 'utf8');
})();
