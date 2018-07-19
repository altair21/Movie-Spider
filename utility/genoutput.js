import fs from 'fs';
import path from 'path';
import _ from 'lodash';

import { objectToTextPath, checkProperty, PropertyPreset } from '../src/util';

const genOutput = () => {
  const fullOutputPath = path.join(__dirname, '..', 'output', 'full_output.json');
  const outputPath = path.join(__dirname, '..', 'output', 'output.json');
  const origin = JSON.parse(fs.readFileSync(fullOutputPath, 'utf8'))
    .filter((obj) => {
      if (obj.classify === 'teleplay') return false;
      if (obj.category.indexOf('短片') !== -1) return false;
      return true;
    });

  origin.forEach(obj => {
    const res = checkProperty(obj);
    if (!res.isCorrect) {
      console.log(res.errorMessages.join('\n'));
    }
  });

  const deleteProperty = (obj) => {
    const res = obj;
    PropertyPreset.forEach(property => {
      if (!property.retainForOutput) {
        delete res[property.name];
      }
    });
    return res;
  };

  objectToTextPath((_.shuffle(origin)).map(deleteProperty), outputPath);
};

genOutput();
