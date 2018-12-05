import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { genOutputObject } from '../src/helper';
import { objectToTextPath } from '../src/util';

(() => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outputPath = path.join(__dirname, '..', 'output', 'output.json');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'));
  const res = genOutputObject(_.shuffle(origin), outputPath);
  objectToTextPath(res, outputPath);
})();
