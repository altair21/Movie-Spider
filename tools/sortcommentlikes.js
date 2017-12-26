import fs from 'fs';
import path from 'path';
import _ from 'lodash';

const sortLikes = () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));

  let res = origin.filter((obj) => obj.commentLikes > 0);
  res = res.sort((a, b) => b.commentLikes - a.commentLikes);
  res.forEach((obj, index) => {
    console.log(`${index + 1}. 《${obj.name}》（${obj.commentLikes} 个有用）：${obj.userComment}`);
  });
};

sortLikes();
