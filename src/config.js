import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { initialState } from './preset/prototype';

const configPath = path.join(__dirname, '..', 'config.yml');

if (!fs.existsSync(configPath)) {
  throw new Error(`没有找到配置文件 ${configPath}`);
}

export const config = {
  ...initialState.config,
  ...yaml.safeLoad(fs.readFileSync(configPath, 'utf8')),
};
