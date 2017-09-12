
const textToObject = (text = '') => {
  const str = text.replace('let data = \'', '').slice(0, -1).split('\\\'').join('\'');
  return JSON.parse(str);
};

const objectToText = (object) =>
  `let data = '${JSON.stringify(object).split('\'').join('\\\'')}'`;

export { textToObject, objectToText };
