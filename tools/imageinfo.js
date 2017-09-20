import fs from 'fs';
import getColors from 'get-image-colors';
import webp from 'webp-converter';
import sizeOf from 'image-size';
import { getBuffer } from '../src/http';

const ImageInfo = () => {
  getBuffer(process.argv[2]).then((buffer) => {
    const imgInfo = sizeOf(buffer);
    const successCb = (colors) => {
      console.log('\x1b[32m%s\x1b[0m', `${imgInfo.width} ${imgInfo.height}`);
      console.log('\x1b[46m\x1b[30m%s\x1b[0m', colors[0].hex());
    };

    if (process.argv[2].endsWith('.webp')) {
      fs.writeFileSync('tmp_image.webp', buffer);
      webp.dwebp('tmp_image.webp', 'tmp_output.png', '-o', (status) => {
        console.log(status);
        getColors('tmp_output.png').then((colors) => {
          successCb(colors);
          fs.unlinkSync('tmp_image.webp');
          fs.unlinkSync('tmp_output.png');
        });
      });
    } else {
      getColors(buffer, 'image/jpeg').then(successCb);
    }
  });
};

ImageInfo();
