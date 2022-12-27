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
  const outputFileNames = [];
  for (const fileName of fileNames) {
    // read the file using fs promise
    const buffer = await fs.promises.readFile(fileName);
    const imageArrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
    process.stdout.write(`Compiling ${fileName}...`);
    const result = await compileScene(imageArrayBuffer);
    const outputFileName = cleanName(fileName) + '.zine';
    await fs.promises.writeFile(outputFileName, [
      zineMagicBytes,
      result,
    ]);
    outputFileNames.push(outputFileName);
    console.log('done', result.length);
  }
  console.warn('Writing zine file index to zines.json...')
  await fs.promises.writeFile(
    'zines.json',
    JSON.stringify(outputFileNames, null, 2)
  );
})();