const pad = n => (n < 10 ? (`0${n}`) : n);

const getDuration = (startTime, endTime = new Date()) => {
  const duration = (endTime.getTime() - startTime.getTime()) / 1000;
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const seconds = Math.floor(duration % 60);
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

export { getDuration };
