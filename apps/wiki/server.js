// const { createServer } = require("https");
// const { parse } = require("url");
// const next = require("next");
// const fs = require("fs");
import {createServer} from 'https';
import {URL} from 'url';
import next from 'next';
import fs from 'fs';

const SERVER_ADDR = '0.0.0.0';
const SERVER_NAME = 'local.webaverse.com';
const port = parseInt(process.env.PORT, 10) || 4444;
const dev = process.env.NODE_ENV !== 'production';
const app = next({
  dev,
});
const handle = app.getRequestHandler();

const httpsOptions = {
  cert: fs.readFileSync('./certs-local/fullchain.pem'),
  key: fs.readFileSync('./certs-local/privkey.pem'),
};

app.prepare()
  .then(() => {
    createServer(httpsOptions, (req, res) => {
      const parsedUrl = new URL(req.url, true);
      handle(req, res, parsedUrl);
    }).listen(port, SERVER_ADDR, (err) => {
      if (err) throw err;
      console.log(`https://${SERVER_NAME}:${port}/`);
      console.log('ready');
    });
  }).catch(err => {
    throw err;
  });