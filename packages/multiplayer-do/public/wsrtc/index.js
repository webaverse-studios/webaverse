require('dotenv').config();
const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const wsrtcServer = require('./wsrtc-server.js');

const fullchainPath = './certs/fullchain.pem';
const privkeyPath = './certs/privkey.pem';

const httpPort = process.env.HTTP_PORT || 3000;
const httpsPort = process.env.HTTPS_PORT || 3001;

console.log('HTTP Port is', httpPort);
console.log('HTTPS Port is', httpsPort);

let CERT = null;
let PRIVKEY = null;
try {
  CERT = fs.readFileSync(fullchainPath);
} catch (err) {
  console.warn(`failed to load ${fullchainPath}`);
}
try {
  PRIVKEY = fs.readFileSync(privkeyPath);
} catch (err) {
  console.warn(`failed to load ${privkeyPath}`);
}

const app = express();
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  next();
});
app.use((req, res, next) => {
  if (req.url === '/config.json') {
    res.status(404);
    res.end();
  } else {
    next();
  }
});
const appStatic = express.static(__dirname);
app.use(appStatic);
app.get('*', (req, res, next) => {
  req.url = '404.html';
  res.set('Content-Type', 'text/html');
  next();
});
app.use(appStatic);

const servers = [];
const httpServer = http.createServer(app)
  .listen(httpPort);
servers.push(httpServer);
console.log('http://localhost:'+httpPort);
if (CERT && PRIVKEY) {
  const httpsServer = https.createServer({
    cert: CERT,
    key: PRIVKEY,
  }, app)
    .listen(httpsPort);
  servers.push(httpsServer);
  console.log('https://localhost:'+httpsPort);
}
for (const server of servers) {
  wsrtcServer.bindServer(server);
}
