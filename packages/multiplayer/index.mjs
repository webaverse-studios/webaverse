import path from 'path';
import child_process from 'child_process';

const MULTIPLAYER_PORT = 2222;

//

const dirname = path.dirname(import.meta.url.replace(/^file:\/\//, ''));
Error.stackTraceLimit = 300;

//

const _waitForRegex = (process, regex) => {
  return new Promise((resolve, reject) => {
    const onerror = err => {
      reject(err);
      cleanup();
    };
    process.on('error', onerror);
    
    process.stdout.setEncoding('utf8');
    const ondata = data => {
      if (regex.test(data)) {
        resolve();
        cleanup();
      }
    };
    process.stdout.on('data', ondata);
    
    const cleanup = () => {
      process.removeListener('error', onerror);
      process.stdout.removeListener('data', ondata);
    };
  });
};
const makeWaitForExit = cp => {
  let exited = false;
  cp.on('close', (code, signal) => {
    exited = true;
  });
  
  return to => {
    if (!exited) {
      return new Promise((accept, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('timeout in process: ' + cp));
        }, to);
          
        const close = (code, signal) => {
          accept(code);
          cleanup();
        };
        cp.on('close', close);
        cp.on('error', err => {
          reject(err);
          cleanup();
        });
        const cleanup = () => {
          cp.removeListener('close', close);
          cp.removeListener('error', reject);
          clearTimeout(timeout);
        };
      });
    } else {
      return Promise.resolve();
    }
  };
};

// let httpServer = null;
let logging = false;
let quitted = false;
const loggedProcesses = [];
const _logProcess = childProcess => {
  const tombstoneLogs = {
    stdout: [],
    stderr: [],
  };
  childProcess.stdout.on('data', data => {
    if (logging && !quitted) {
      process.stdout.write(data);
    }
    tombstoneLogs.stderr.push(data);
    while (tombstoneLogs.stderr.length > 1000) {
      tombstoneLogs.stderr.shift();
    }
  });
  childProcess.stderr.on('data', data => {
    if (logging && !quitted) {
      process.stderr.write(data);
    }
    tombstoneLogs.stderr.push(data);
    while (tombstoneLogs.stderr.length > 1000) {
      tombstoneLogs.stderr.shift();
    }
  });
  loggedProcesses.push(childProcess);

  childProcess.on('close', (exitCode, signal) => {
    if (!quitted) {
      console.log(`${childProcess.name} process exited with code ${exitCode} and signal ${signal}`);
      if (exitCode !== 0) {
        console.log('stdout:\n', tombstoneLogs.stdout.join(''));
        console.log('stderr:\n', tombstoneLogs.stderr.join(''));
      }
    }
  });
};
{
  if(process.stdin.setRawMode)
    process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');
  const killall = async () => {
    quitted = true;
    // console.log('quit 2');
    for (const cp of loggedProcesses) {
      console.log('kill pid', cp.name, cp.pid);
      // treeKill(cp.pid, 9);
      try {
        process.kill(cp.pid, 'SIGTERM');
      } catch(err) {
        if (err.code !== 'ESRCH') {
          console.warn(err.stack);
        }
      }
    }
    await Promise.all(loggedProcesses.map(cp => cp.waitForExit(10 * 1000)));
  };
}



const _startMultiplayer = async () => {
  const multiplayerPath = path.join(dirname);
  const wranglerPath = path.join(dirname, 'node_modules', 'wrangler');
  const multiplayerProcess = child_process.spawn(process.argv[0], [wranglerPath, 'dev', '-l', '--port', MULTIPLAYER_PORT + ''], {
    cwd: multiplayerPath,
    env: {
      ...process.env,
      PORT: MULTIPLAYER_PORT,
    },
    // uid: oldUid,
  });
  multiplayerProcess.name = 'multiplayer';
  multiplayerProcess.waitForExit = makeWaitForExit(multiplayerProcess);
  
  _logProcess(multiplayerProcess);

  await _waitForRegex(multiplayerProcess, /starting/i);

  return multiplayerProcess;
};

_startMultiplayer()