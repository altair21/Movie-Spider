import fs from 'fs';
import path from 'path';
import _ from 'lodash';
import { openFilmOrigin } from '../src/util';
import { config } from '../src/config';

const SortMode = {
  userScore: 'userScore',
  score: 'score',
  markDate: 'markDate',
  year: 'year',
};
const Order = {
  ascending: 'asc',
  descending: 'desc',
};
const Logical = {
  or: 'or',
  join: 'join',
};

const {
  filterCategory, filterTag, keywords, sortMode, order, logical,
} = config.filter;

const outputPath = path.join(__dirname, `filterd${filterCategory ? `-category-${keywords.category.join('-')}` : ''}${filterCategory && filterTag ? `-${logical}` : ''}${filterTag ? `-tags-${keywords.tags.join('-')}` : ''}.txt`);

(async () => {
  let origin = openFilmOrigin(false, true, o => !_.isNull(o[sortMode]));
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
  } else if (sortMode === SortMode.year) {
    res = res.sort((a, b) => {
      if (+a[sortMode] === +b[sortMode]) {
        return b.score - a.score;
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

  const text = res.map((obj, index) => `${index + 1}. 《${obj.name}》（${obj.director.join('、')} 执导，${obj.year}） ${sortMode}: ${obj[sortMode]}`);
  fs.writeFileSync(outputPath, text.join('\n'), 'utf8');
})();
