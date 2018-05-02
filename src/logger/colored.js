
const ForeColor = {
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

const BackColor = {
  black: '\x1b[40m',
  red: '\x1b[41m',
  green: '\x1b[42m',
  yellow: '\x1b[43m',
  blue: '\x1b[44m',
  magenta: '\x1b[45m',
  cyan: '\x1b[46m',
  white: '\x1b[47m',
};

const ColorType = {
  foreground: 1,
  background: 2,
};

const Color = {
  black: 'black',
  red: 'red',
  green: 'green',
  yellow: 'yellow',
  blue: 'blue',
  magenta: 'magenta',
  cyan: 'cyan',
  white: 'white',
};

const colored = (type) => (color) => (text) => {
  let _color = ForeColor[color];
  if (type === ColorType.background) {
    _color = BackColor[color];
  }
  return `${_color}${text}\x1b[0m`;
};

const stripColor = (str = '') => {
  let res = str;
  const keys1 = Object.keys(ForeColor);
  for (let i = 0, l = keys1.length; i < l; i++) {
    res = res.split(ForeColor[keys1[i]]).join('');
  }
  const keys2 = Object.keys(BackColor);
  for (let i = 0, l = keys2.length; i < l; i++) {
    res = res.split(BackColor[keys2[i]]).join('');
  }
  res = res.split('\x1b[0m').join('');
  return res;
};

export { Color, ColorType, colored, stripColor };
