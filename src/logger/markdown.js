
const headerPreset = '###############';
const header = (level) => (text) => `${headerPreset.substr(0, level)} ${text}`;

const disorderItem = (text) => `- ${text}`;

const bold = (text) => `**${text}**`;

const italic = (text) => `*${text}*`;

const block = (text) => `> ${text}\n`;

export { header, disorderItem, bold, italic, block };
