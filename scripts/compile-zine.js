#!/usr/bin/env node

import path from 'path';
import fs from 'fs';
import {
  compileScene,
} from '../zine-runtime/zine-remote-compiler.js';
import {
  zineMagicBytes,
} from 'zine/zine-format.js';

const cleanName = name => path.basename(name).replace(/\.[^\.]+$/, '');

(async () => {
  const fileNames = process.argv.slice(2);

  async function processFile(fileName, index) {
    // read the file using fs promise
    console.log(`Compiling ${fileName} [${index + 1}/${fileNames.length}]...`);
    const buffer = await fs.promises.readFile(fileName);
    const imageArrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    const result = await compileScene(imageArrayBuffer);
    console.log(`${fileName}: ${result.byteLength} ok`);
    const outputFileName = cleanName(fileName) + '.zine';
    await fs.promises.writeFile(outputFileName, [
      zineMagicBytes,
      result,
    ]);
    return outputFileName;
  }

  const parallelism = 4;
  class Queue {
    constructor() {
      this.semaphoreValue = parallelism;
      this.queue = [];
    }
    async processFile(fileName, index) {
      if (this.semaphoreValue > 0) {
        this.semaphoreValue--;
        
        const result = await processFile(fileName, index);

        this.semaphoreValue++;
        if (this.queue.length > 0) {
          const {fileName, index, accept, reject} = this.queue.shift();
          this.processFile(fileName, index)
            .then(accept, reject);
        }
        return result;
      } else {
        const result = await new Promise((accept, reject) => {
          this.queue.push({
            fileName,
            index,
            accept,
            reject,
          });
        });
        return result;
      }
    }
  }

  const queue = new Queue();
  const promises = fileNames.map((fileName, index) => queue.processFile(fileName, index));
  const outputFileNames = await Promise.all(promises);
  console.warn('Writing zine files index to zines.json...')
  await fs.promises.writeFile(
    'zines.json',
    JSON.stringify(outputFileNames, null, 2)
  );
})();