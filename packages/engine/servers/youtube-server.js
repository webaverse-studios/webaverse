import url from 'url';
import fs from 'fs';
import mktemp from 'mktemp';
import youtubedl from 'youtube-dl-exec';

//

export class YoutubeServer {
  constructor() {
    // nothing
  }
  async handleRequest(req, res) {
    try {
      console.log('youtube server handle request', req.url);

      const u = url.parse(req.url, true);

      if (u.pathname.startsWith('/api/youtube/') && u.query.url && u.query.type) {
        const youtubeUrl = u.query.url;
        const {type} = u.query;
        
        if (type === 'audio') {
          const p = await mktemp.createFile('XXXXXXXX.mp3');
          const rootName = p.match(/^([^\.]*)\./)[1];
          
          const outputPath = `/tmp/${rootName}.%(ext)s`;
          console.log('load audio', {
            youtubeUrl,
            outputPath,
          });

          youtubedl(youtubeUrl, {
            extractAudio: true,
            audioFormat: 'mp3',
            // dumpSingleJson: true,
            output: outputPath,
            // output: p,
            // noContinue: true,
            // output: '-.mp3s', // stdout
          }).then(out => {
            // console.log('out 1', out);

            const p2 = `/tmp/${rootName}.mp3`;

            const rs = fs.createReadStream(p2);
            rs.on('error', err => {
              console.warn('read stream error', err);
              res.sendStatus(500);

              cleanup();
            });
            rs.on('finish', () => {
              // console.log('read stream finish');

              cleanup();
            });
            res.setHeader('Content-Type', 'audio/mpeg');
            rs.pipe(res);

            const cleanup = async () => {
              await fs.promises.unlink(p);
              await fs.promises.unlink(p2);
            };
          }).catch(err => {
            console.warn('err', err);
          });
        } else if (type === 'video') {
          const p = await mktemp.createFile('XXXXXXXX.mp4');
          const rootName = p.match(/^([^\.]*)\./)[1];

          const outputPath = `/tmp/${rootName}.%(ext)s`;
          console.log('load video', {
            youtubeUrl,
            outputPath,
          });

          youtubedl(youtubeUrl, {
            // extractAudio: true,
            // audioFormat: 'mp3',
            // dumpSingleJson: true,
            format: 'bv[ext=mp4]+ba[ext=m4a]',
            output: outputPath,
            // output: p,
            // noContinue: true,
          }).then(out => {
            // console.log('out', out);

            const p2 = `/tmp/${rootName}.mp4`;

            const rs = fs.createReadStream(p2);
            rs.on('error', err => {
              console.warn('read stream error', err);
              res.sendStatus(500);

              cleanup();
            });
            rs.on('finish', () => {
              // console.log('read stream finish');

              cleanup();
            });
            res.setHeader('Content-Type', 'video/mp4');
            rs.pipe(res);

            const cleanup = async () => {
              await fs.promises.unlink(p);
              await fs.promises.unlink(p2);
            };
          }).catch(err => {
            console.warn('err', err);
          });
        } else {
          console.warn('unknown type', type);
          res.sendStatus(400);
        }
      } else {
        console.warn('image client had no url match', req.url);
        res.sendStatus(404);
      }
    } catch (err) {
      console.warn('youtube client error', err);
      res.status(500).send(err.stack);
    }
  }
}