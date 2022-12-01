const {
  launchBrowser,
  enterScene,
  closeBrowser,
  displayLog,
  setupExcel,
  saveExcel,
  setCurrentScene,
  getAppCountFromScene,
  getErrorList,
  totalTimeout,
  getCurrentPage,
} = require('../utils/utils');
const sceneUrls = require('../../scenes/scenes.json');

let currntTest = ''
let recentTestPassed = ''

describe.only('should load scene works', () => {
  beforeAll(async () => {
    await launchBrowser();
    await setupExcel();
    // Todo: define custom functions here
    // await page.evaluate(async () => {
    // 	window.todo = () => {}
    // })
  }, totalTimeout);

  afterAll(async () => {
    await closeBrowser();
  }, totalTimeout);

  test.each(sceneUrls) (
    'should scene load works %s',
    async sceneUrl => {
      let isSuccess = false
      try {
        // Todo: check timeout case
        if (recentTestPassed !== currntTest) {
          displayLog('fail', 'Scene loaded failed timeout: ', `${currntTest}`)
          saveExcel(currntTest)
        }

        currntTest = sceneUrl
        setCurrentScene(sceneUrl)

        const page = getCurrentPage();

        displayLog('section', 'Should scene load works started: ', `${sceneUrl}`);
      
        await enterScene(`https://local.webaverse.com/?src=/packages/scenes/${sceneUrl}`);

        const result = await page.evaluate(async () => {
          // @ts-ignore
          try {
            const loadedApps =
              window.globalWebaverse.world.appManager.getApps();
            const loadedAppCount = loadedApps.length;
          // add some validation code here
            return {
              isSceneLoaded: true,
              loadedAppCount,
            };
          } catch (error) {
            console.error(error);
            return {
              isSceneLoaded: false,
              loadedAppCount: 0,
            };
          }
        });

        displayLog('step', 'Should scene load works: ', 'trying to avatar moving');

        await page.waitForTimeout(2000);

        const firstPosition = await page.evaluate(async () => {
          return window.globalWebaverse.playersManager.localPlayer.position;
        });

        const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
        const key = keys[Math.floor(Math.random() * keys.length)];
        await page.keyboard.down(key);
        await page.waitForTimeout(1000);
        const playerMove = await page.evaluate(
          async ({firstPosition, key}) => {
            const avatar = window.globalWebaverse.playersManager.localPlayer.avatar;
            const currentSpeed = avatar.velocity.length();
            const idleWalkFactor = avatar.idleWalkFactor;
            const currentPosition = window.globalWebaverse.playersManager.localPlayer.position;
            return {
              currentSpeed,
              idleWalkFactor,
              currentPosition,
              // isCorrectMove,
            };
          },
          {firstPosition, key},
        );
        await page.keyboard.up(key);
        await page.waitForTimeout(3000);

        displayLog('step', 'Should scene load works: ', 'Validation checking');
        const errorLists = getErrorList()
        if (result.isSceneLoaded && errorLists.length === 0) {
          displayLog('success', 'Screen loaded properly');
        } else {
          displayLog('error', 'Screen not properly loaded, Please check out the browser console');
        }

        const appCount = await getAppCountFromScene(sceneUrl)
        if (result.loadedAppCount !== appCount) {
          displayLog('error', 'Child apps not fully loaded: ', `${result.loadedAppCount} of ${appCount}`);
        } else {
          displayLog('success', 'Child apps fully loaded: ', `${result.loadedAppCount} of ${appCount}`);
        }

        displayLog(playerMove.currentPosition !== firstPosition? 'success' : 'error', 'Should scene load works: ', 'Test player avatar movement');

        isSuccess = result.isSceneLoaded && result.loadedAppCount === appCount && errorLists.length === 0 && playerMove.currentPosition !== firstPosition;
      } catch (error) {
        console.error(error)
      }

      saveExcel(sceneUrl)
      recentTestPassed = sceneUrl

      if (currntTest === sceneUrl) {
        if (isSuccess) {
          displayLog('passed', 'Scene loaded successfully: ', `${sceneUrl}`);
        } else {
          displayLog('fail', 'Scene loaded failed: ', `${sceneUrl}`);
        }
        expect(isSuccess).toBeTruthy();
      }
    },
    totalTimeout,
  );
});

// describe('should switch scene works', () => {
//   ``;
//   beforeAll(async () => {
//     await launchBrowser();
//     // Todo: define custom functions here
//     // await page.evaluate(async () => {
//     // 	window.todo = () => {}
//     // })
//     await enterScene('https://local.webaverse.com/');
//   }, totalTimeout);

//   afterAll(async () => {
//     await closeBrowser();
//   }, totalTimeout);

//   test.each(sceneUrls)(
//     'should scene switch works %s',
//     async sceneUrl => {
//       displayLog('section', 'Should scene switch works started: ', `${sceneUrl}`);
//       const page = getCurrentPage();

//       resetErrorList();

//       displayLog('step', 'Should scene switch works: ', 'Open scene list');
//       await page.evaluate(async sceneUrl => {
//         document.querySelector('._button_1fev9_13').click();
//         console.log(`======================= Going to Open ${sceneUrl} =======================`);
//       }, sceneUrl);

//       const mousePos = await page.evaluate(async sceneUrl => {
//         const nodeLists = document.querySelectorAll('div._room_1fev9_22');
//         let mouseX, mouseY;
//         nodeLists.forEach(nodeElement => {
//           const url = nodeElement.querySelector('div').innerHTML;
//           const lastIndex = url.lastIndexOf('/');
//           const name = url.slice(lastIndex + 1);
//           if (sceneUrl === name) {
//             // scroll to view
//             nodeElement.scrollIntoView();
//             // mouse position
//             const rect = nodeElement.getBoundingClientRect();
//             mouseX = (rect.left + rect.right) / 2;
//             mouseY = (rect.top + rect.bottom) / 2;
//           }
//         });
//         return {
//           x: mouseX,
//           y: mouseY,
//         };
//       }, sceneUrl);

//       displayLog('step', 'Should scene switch works: ', 'Move mouse to list and click');

//       await page.mouse.move(mousePos.x, mousePos.y);
//       await page.waitForTimeout(500);
//       await page.mouse.click(mousePos.x, mousePos.y);
//       await page.waitForTimeout(500);

//       const result = await page.evaluate(async () => {
//         // @ts-ignore
//         try {
//           await window.globalWebaverse.webaverse?.waitForLoad();
//           await window.globalWebaverse.universe?.waitForSceneLoaded();
//           const loadedApps =
//             window.globalWebaverse.world.appManager.getApps();
//           const loadedAppCount = loadedApps.length;
//           // add some validation code here
//           return {
//             isSceneLoaded: true,
//             loadedAppCount,
//           };
//         } catch (error) {
//           console.error('error loading ', error);
//           return {
//             isSceneLoaded: false,
//             loadedAppCount: 0,
//           };
//         }
//       });

//       const appCount = await getAppCountFromScene(sceneUrl)

//       displayLog('step', 'Should scene switch works: ', 'Validation checking');

//       const errorLists = getErrorList()

//       if (result.isSceneLoaded && errorLists.length === 0) {
//         displayLog('success', 'Screen loaded properly');
//       } else {
//         displayLog('error', 'Screen not properly loaded, Please check out the browser console');
//       }

//       if (result.loadedAppCount !== appCount) {
//         displayLog('error', 'Child apps not fully loaded: ', `${result.loadedAppCount} of ${appCount}`);
//       } else {
//         displayLog('success', 'Child apps fully loaded: ', `${result.loadedAppCount} of ${appCount}`);
//       }

//       const isSuccess = result.isSceneLoaded && result.loadedAppCount === appCount && errorLists.length === 0;

//       if (isSuccess) {
//         displayLog('passed', 'Scene loaded successfully: ', `${sceneUrl}`);
//       } else {
//         displayLog('fail', 'Scene loaded failed: ', `${sceneUrl}`);
//       }

//       expect(isSuccess).toBeTruthy();
//     },
//     totalTimeout,
//   );
// });