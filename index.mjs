import path from 'path';
import fs from 'fs';

import child_process from 'child_process';

//

const SERVER_NAME = 'local.webaverse.com';
const DEVSERVER_PORT = 443;
const MULTIPLAYER_PORT = 2222;
const COMPILER_PORT = 3333;
const WIKI_PORT = 4444;
const RENDERER_PORT = 5555;

//

const dirname = path.dirname(import.meta.url.replace(/^file:\/\//, ''));
Error.stackTraceLimit = 300;

//

const open = url => {
  const s = fs.readFileSync('/proc/version', 'utf8');
  const isWsl = /microsoft/i.test(s);

  if (process.platform === 'win32' || isWsl) {
    // console.log('spawn', 'cmd.exe', ['/C', 'start ' + url]);
    // console.log('got old path', process.env.PATH, process.env.OLDPATH);
    const cp = child_process.spawn('cmd.exe', ['/C', 'start ' + url]);
    cp.on('error', err => {
      console.warn(err);
    });
  } else if (process.platform === 'linux') {
    const cp = child_process.spawn('xdg-open', [url]);
    cp.on('error', err => {
      console.warn(err);
    });
  } else /* if (process.platform === 'darwin') */ {
    const cp = child_process.spawn('open', [url]);
    cp.on('error', err => {
      console.warn(err);
    });
  }
};

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
  const data = (key) => {
    if (key === 'a') {
      open(`https://local.webaverse.com/`);
    } else if (key === 'm') {
      open(`http://127.0.0.1:${MULTIPLAYER_PORT}/`);
    } else if (key === 'w') {
      open(`https://local.webaverse.com:${WIKI_PORT}/`);
    } else if (key === 'p') {
      open(`http://127.0.0.1:${RENDERER_PORT}/`);
    // } else if (key === 't') {
    //   _startE2eTest()
    } else if (key === 'd') {
      logging = !logging;
      console.log('logging', logging);
    } else if (key === '\x03') { // ctrl-c
      killall();
      process.exit();
    } else if (key === 'q') {
      (async () => {
        await killall();
        process.exit();
      })();
    }
  };
  process.stdin.on('data', data);
}

/* const _startE2eTest = () => {
  const cp = child_process.spawn('npm', ['run', 'test-e2e'], {
    env: process.env,
    cwd: dirname,
    stdio: 'inherit'
  });
  cp.on('error', err => {
    console.warn(err);
  });
} */

const _startDevServer = async () => {
  const devServerProcess = child_process.spawn(process.argv[0], ['./dev-server.js'], {
    cwd: dirname,
    env: {
      ...process.env,
      PORT: DEVSERVER_PORT,
      COMPILER_PORT,
      RENDERER_PORT,
    },
    // uid: oldUid,
    stdio: 'pipe',
  });
  devServerProcess.name = 'dev-server';
  devServerProcess.waitForExit = makeWaitForExit(devServerProcess);

  devServerProcess.stdout.pipe(process.stdout);
  devServerProcess.stderr.pipe(process.stderr);
  
  _logProcess(devServerProcess);

  await _waitForRegex(devServerProcess, /local/i);

  return devServerProcess;
};
const _startCompiler = async () => {
  const compilerPath = path.join(dirname, 'packages', 'compiler');
  // const nextPath = path.join(dirname, 'node_modules', '.bin', 'next');
  
  const compilerProcess = child_process.spawn(
    process.argv[0],
    ['index.mjs'],
    {
      cwd: compilerPath,
      env: {
        ...process.env,
        PORT: COMPILER_PORT,
        BASE_CWD: dirname,
      },
      // uid: oldUid,
      stdio: 'pipe',
    }
  );
  compilerProcess.name = 'compiler';
  compilerProcess.waitForExit = makeWaitForExit(compilerProcess);
  
  _logProcess(compilerProcess);

  compilerProcess.stdout.pipe(process.stdout);
  compilerProcess.stderr.pipe(process.stderr);

  await _waitForRegex(compilerProcess, /ready/i);

  return compilerProcess;
};
const _startMultiplayer = async () => {
  const nodePath = process.argv[0];
  const multiplayerPath = path.join(dirname, 'packages', 'multiplayer');
  const wranglerPath = path.join(dirname, 'node_modules', '.bin', 'wrangler');
  const multiplayerProcess = child_process.spawn(nodePath, [
    wranglerPath,
    'dev',
    '-l',
    '--port',
    MULTIPLAYER_PORT + '',
  ], {
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
const _startRenderer = async () => {
  const rendererPath = path.join(dirname, 'packages', 'previewer');
  const rendererProcess = child_process.spawn(process.argv[0], ['server.js'], {
    cwd: rendererPath,
    env: {
      // ...process.env,
      PORT: RENDERER_PORT,
    },
    // uid: oldUid,
    stdio: 'pipe',
  });
  rendererProcess.name = 'renderer';
  rendererProcess.waitForExit = makeWaitForExit(rendererProcess);

  rendererProcess.stdout.pipe(process.stdout);
  rendererProcess.stderr.pipe(process.stderr);
  
  _logProcess(rendererProcess);

  await _waitForRegex(rendererProcess, /ready/i);

  return rendererProcess;
};

//

(async () => {
  await Promise.all([
    _startDevServer(),
    _startCompiler(),
    _startRenderer(),
    _startMultiplayer(),
  ]);

  console.log(`Welcome to the Webaverse!`);
  console.log(`  > Local: https://${SERVER_NAME}:${DEVSERVER_PORT}/`);
  console.log('You have some options...');
  console.log(`[A] App  [W] Wiki  [M] Multiplayer  [R] Renderer  [T] Automated Tests  [D] Debug logging  [Q] Quit`);
})();