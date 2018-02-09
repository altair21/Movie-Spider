const pad = n => (n < 10 ? (`0${n}`) : n);

const getDuration = (startTime, endTime = new Date()) => {
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const getTodayDate = () => {
  const date = new Date();
  const year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  if (month >= 1 && month <= 9) {
    month = `0${month}`;
  }
  if (day >= 1 && day <= 9) {
    day = `0${day}`;
  }
  return `${year}-${month}-${day}`;
};

const getTimeByHMS = () => {
  const date = new Date();
  const hours = date.getHours() < 10 ? `0${date.getHours()}` : date.getHours();
  const minutes = date.getMinutes() < 10 ? `0${date.getMinutes()}` : date.getMinutes();
  const seconds = date.getSeconds() < 10 ? `0${date.getSeconds()}` : date.getSeconds();
  return `${hours}:${minutes}:${seconds}`;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export { getDuration, getTodayDate, getTimeByHMS, sleep };
