const puppeteer = require('puppeteer');
const chalk = require('chalk');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
const path = require("path");

const width = 800;
const height = 400;
// const width = 2400;
// const height = 1200;
let browsers = [];
const pages = [];
let errorLists = []
const totalTimeout = 5 * 60 * 1000
let retryCount = 0
let isReConnectionNeeded = false

const isdebug = false;

let csvWriter = null
let csvRecords = []
const isWriteCSV = false

let currentScene

const setupExcel = async () => {
  if (!isWriteCSV) return
  const testFilePath = `test-${Math.floor(Date.now() / 1000)}.csv`
  try {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  } catch (error) {
    console.error(error)
  }
  try {
    csvWriter = createCsvWriter({
      path: testFilePath,
      header: [
        {title: 'Scene', id: 'scene'},
        {title: 'type', id: 'type'},
        {title: 'Message', id: 'message'},
        {title: 'Message', id: 'message2'},
      ],
    });
  } catch (error) {
    console.error(error)
  }
}

const setCurrentScene = async str => {
  currentScene = str
  resetErrorList();
}

const saveExcel = async str => {
  if (!isWriteCSV) return
  try {
    if (currentScene !== str) return
    await csvWriter.writeRecords(csvRecords)
    csvRecords = []
  } catch (error) {
    console.error(error)
  }
}

const updateExcelRow = (type, message, message2) => {
  if (!isWriteCSV) return
  if (csvWriter
    && (type === 'section'
      || type === 'error'
      || type === 'success'
      || type === 'passed'
      || type === 'fail')
  ) {
    try {
      csvRecords.push({
        scene: currentScene,
        type,
        message,
        message2,
      })
    } catch (error) {
      console.error(error)
    }
  }
}

const displayLog = async (type, message, message2 = '') => {
  if (!isdebug) return
  if (!chalk.supportsColor) {
    console.log(type, message, message2);
  }
  let output = '';
  if (type === 'action') {
    output = `${chalk.reset.white.bgGreen.bold(' ACTION ')} ${message} ${chalk.underline.greenBright(message2)}`;
  } else if (type === 'section') {
    output = `${chalk.reset.black.bgYellowBright.bold(' START ')} ${message} ${chalk.underline.yellowBright(message2)}`;
  } else if (type === 'step') {
    output = `${chalk.reset.white.bold(' STEP ')} ${message} ${chalk.reset.white(message2)}`;
  } else if (type === 'error') {
    output = `${chalk.reset.redBright.bold(' ERROR ')} ${message} ${chalk.reset.white(message2)}`;
  } else if (type === 'browsererror') {
    output = `${chalk.reset.redBright.bold(' BROWSER ERROR ')} ${message} ${chalk.reset.white(message2)}`;
  } else if (type === 'success') {
    output = `${chalk.reset.greenBright.bold(' SUCCESS ')} ${message} ${chalk.reset.white(message2)}`;
  } else if (type === 'info') {
    output = `${chalk.reset.whiteBright.bold(' INFO ')} ${message} ${chalk.underline.greenBright(message2)}`;
  } else if (type === 'log') {
    output = `${chalk.reset.gray.bold(' LOG ')} ${message} ${chalk.underline.greenBright(message2)}`;
  } else if (type === 'passed') {
    output = `${chalk.reset.white.bgGreenBright.bold(' PASSED ')} ${message} ${chalk.underline.greenBright(message2)}`;
  } else if (type === 'fail') {
    output = `${chalk.reset.white.bgRedBright.bold(' FAILED ')} ${message} ${chalk.underline.redBright(message2)}`;
  }
  process.stderr.write(`${output}\n`);
  updateExcelRow(type, message, message2)
}

const throwErrors = async (text, isQuit) => {
  if (isQuit) await closeBrowser();
  displayLog('error', text);
  // throw Error(text);
};

const getErrorList = () => {
  return errorLists
}

const resetErrorList = () => {
  errorLists = []
}

const setupErrorList = async page => {
  const cdp = await page.target().createCDPSession();
  await cdp.send('Log.enable');
  cdp.on('Log.entryAdded', async ({entry}) => {
    if (entry.level === 'error') {
      const errorMsg = `${entry.text} ${entry.url}`
      const tempMsg = errorMsg.replace(/\s/g, '').toLowerCase()
      if (errorLists.indexOf(tempMsg) === -1) {
        displayLog('error', entry.text, entry.url);
        errorLists.push(tempMsg)
      }
    }
  });

  page.on('console', async e => {
    if (e.type() === 'error') {
      const errorMsg = e.text()
      const errorLocation = e.location()
      const tempMsg = errorMsg.replace(/\s/g, '').toLowerCase()
      if (errorLists.indexOf(tempMsg) === -1) {
        displayLog('error', errorMsg, errorLocation.url ? errorLocation.url : '');
        errorLists.push(tempMsg)
      }
    }
  });

  await page.exposeFunction('browserError', error => {
    const errorMsg = `${error.msg} ${error.url}`
    const tempMsg = errorMsg.replace(/\s/g, '').toLowerCase()
    if (errorLists.indexOf(tempMsg) === -1) {
      displayLog('error', error.msg, error.url);
      errorLists.push(tempMsg)
    }
  });

  await page.evaluate(async () => {
    try {
      window.onerror=function(msg, url, line){
        window.browserError({msg, url, line})
        return true;
      }
    } catch (error) {
      console.error(error)
    }
  });
  
}

const getDimensions = () => {
  return {
    width,
    height,
  };
};

const launchBrowser = async isMulti => {
  displayLog('action', 'Start launch browsers');
  const browserCount = isMulti ? 2 : 1
  for (let i = 0; i < browserCount; i++) {
    const browser = await puppeteer.launch({
      // headless: !isdebug,
      headless: true,
      args: [
        '--no-sandbox',
        // '--use-gl=egl',
        '--use-gl=swiftshader',
        '--disable-dev-shm-usage',
        '--disable-setuid-sandbox',
        '--no-sandbox',
        '--enable-surface-synchronization',
        '--enable-webgl',
        '--disable-web-security=1',
        '--mute-audio',
      ],
      devtools: isdebug,
    });
    browsers.push(browser)

    const page = (await browser.pages())[0];
    await page.setViewport({width, height});
    setupErrorList(page)
    pages.push(page)
  }
};

const closeBrowser = async () => {
  browsers.forEach(async browser => {
    await browser.close();
  })
  browsers = []
};

const getCurrentPage = (playerIndex = 0) => {
  return pages[playerIndex];
};


const navigate = async (url, playerIndex = 0) => {
  try {
    // const browser = browsers[playerIndex]
    const page = pages[playerIndex]
    // if (!browser) {
    //   throw Error('Cannot navigate without a browser!');
    // }
    // const context = browser.defaultBrowserContext();

    // const parsedUrl = new Url(url);
    // context.overridePermissions(url, ['microphone', 'camera']);

    displayLog('action', `Going to url: ${url}`);

    await page.goto(url, {waitUntil: 'load', timeout: totalTimeout});

    // const granted = await page.evaluate(async () => {
    // 	return (await navigator.permissions.query({ name: 'camera' })).state
    // })
    return true
  } catch (error) {
    console.error(error)
    if (!isReConnectionNeeded) {
      isReConnectionNeeded = true
      retryCount = 0
      await reConnection(url, playerIndex)
    }
    return false
  }
};

const reConnection = async (url, playerIndex) => {
  while(isReConnectionNeeded === true && retryCount < 10)
  {
    const isConnected = await navigate(url, playerIndex);
    retryCount += 1;
    isReConnectionNeeded = !isConnected
    if (!isConnected) {
      // Wait a few seconds, also a good idea to swap proxy here*
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  return !isReConnectionNeeded
}

const enterScene = async (url, playerIndex = 0) => {
  await navigate(url, playerIndex);
  const page = pages[playerIndex]
  await defineFunctions(page);
  if (isReConnectionNeeded) {
    isReConnectionNeeded = false
    await throwErrors('Cannot load the current scene!', false);
  } else {
    const isSceneLoaded = await page.evaluate(async totalTimeout => {
      try {
        await window.waitForUntil(() => {
          return window?.globalWebaverse
        }, totalTimeout / 2);
        await window.globalWebaverse.webaverse?.waitForLoad();
        await window.globalWebaverse.universe?.isSceneLoaded();
        await window.globalWebaverse.universe?.waitForSceneLoaded();
        return await window.waitForUntil(() => {
          const avatar = window.globalWebaverse.playersManager?.localPlayer?.avatar;
          return (avatar?.model && avatar?.model?.visible) || (avatar?.crunchedModel && avatar?.crunchedModel?.visible);
        }, totalTimeout);
      } catch (error) {
        console.error('error loading ', error);
        return false;
      }
    }, totalTimeout);
    if (!isSceneLoaded) {
      await throwErrors('Cannot load the current scene!', false);
    }
  }
  displayLog('action', `Scene Loaded url: ${url}`);
};

const defineFunctions = async page => {
  // exposeFunction function does not work well
  // await page.exposeFunction('getAngle', getAngle)
  await page.evaluate(async () => {
    // the interval of exposeFunc does not work
    window.waitForUntil = async (fn, timeout) => {
      return await new Promise((resolve, reject) => {
        const startTime = performance.now();
        const timer = setInterval(() => {
          const flag = fn();
          if (flag) {
            clearInterval(timer);
            resolve(true);
          } else {
            const currentTime = performance.now();
            if (currentTime - startTime > timeout) {
              console.error('wait for until - failed 180s');
              clearInterval(timer);
              resolve(false);
            }
          }
        }, 100);
      });
    };
  });
};

const getAppCountFromScene = async sceneUrl => {
  let appCount = 0
  try {
    const data = await fs.readFileSync(path.resolve(__dirname, `../../scenes/${sceneUrl}`))
    const result = JSON.parse(data)
    if (result && result.objects) {
      appCount = result.objects.length
    }
  } catch (error) {
    console.error(error)
  }
  return appCount
}

module.exports = {
  totalTimeout,
  getCurrentPage,
  getDimensions,
  launchBrowser,
  closeBrowser,
  enterScene,
  setCurrentScene,
  saveExcel,
  setupExcel,
  getAppCountFromScene,
  displayLog,
  getErrorList,
  resetErrorList,
};