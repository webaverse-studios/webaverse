const {
  launchBrowser,
  enterScene,
  closeBrowser,
  displayLog,
  totalTimeout,
  getCurrentPage,
} = require('../utils/utils');

describe('should eat and drink', () => {
  beforeAll(async () => {
    await launchBrowser();
    // Todo: define custom functions here
    // await page.evaluate(async () => {
    // 	window.todo = () => {}
    // })
    await enterScene(
      'https://local.webaverse.com/?src=./test-e2e/scenes/test-e2e-food.scn',
    );
    const page = getCurrentPage();
    await page.click('#root');
    await page.mouse.wheel({deltaY: 300});
    await page.waitForTimeout(2000);
  }, totalTimeout);

  afterAll(async () => {
    await closeBrowser();
  }, totalTimeout);

  test(
    'should eat and drink: fruit',
    async () => {
      displayLog('section', 'should eat and drink started', 'fruit');
      const page = getCurrentPage();
      // move to sword position and rotate
      displayLog('step', 'should eat and drink: ', 'move to fruit position')
      await page.evaluate(async () => {
        globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 2, y: 1.5, z: 2.4},
        );
      });
      await page.waitForTimeout(2000);

      // grab the fruit
      displayLog('step', 'should eat and drink: ', 'grab the fruit')
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isFoodAttached = await page.evaluate(async () => {
        // Todo: check fruit is attached
        try {
          const attachedApp =
                globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
                  app => app.name == 'fruit',
                );
          if (attachedApp.length != 1) return false;
          const instanceId =
                globalWebaverse.playersManager.localPlayer.getAction(
                  'wear',
                ).instanceId;
          return attachedApp[0].instanceId == instanceId;
        } catch (error) {
          return false;
        }
      });

      displayLog('step', 'should eat and drink: ', 'feed')
      await page.mouse.down();
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        globalWebaverse.game.menuMouseDown();
      });
      await page.waitForTimeout(5000);
      const feedResult = await page.evaluate(async () => {
        const useTime =
            globalWebaverse.playersManager.localPlayer.avatar.useTime;
        const useAnimation =
            globalWebaverse.playersManager.localPlayer.avatar.useAnimation;
        return {
          useTime,
          useAnimation,
        };
      });

      await page.evaluate(async () => {
        globalWebaverse.game.menuMouseUp();
      });
      await page.mouse.up();
      await page.waitForTimeout(2000);

      const isFoodUnAttached = await page.evaluate(async () => {
        try {
          const attachedApp =
                globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
                  app => app.name == 'fruit',
                );
          return attachedApp.length == 0;
        } catch (error) {
          return false;
        }
      });

      // move to front of target //NPC01
      displayLog('step', 'should eat and drink: ', 'move to zero position')
      await page.evaluate(async () => {
        globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should eat and drink: ', 'Validation checking')

      displayLog(isFoodAttached ? 'success' : 'error', 'should eat and drink: grab the fruit');

      displayLog(feedResult.useTime > 0 && feedResult.useAnimation === 'eat' ? 'success' : 'error', 'should eat and drink: eat animation');

      displayLog(isFoodUnAttached ? 'success' : 'error', 'should eat and drink: ungrab the fruit');

      const isSuccess = isFoodAttached && feedResult.useTime > 0 && feedResult.useAnimation === 'eat' && isFoodUnAttached

      displayLog(isSuccess ? 'passed' : 'fail', 'should eat and drink: ', 'fruit');

      expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );

  test(
    'should eat and drink: potion',
    async () => {
      displayLog('section', 'should eat and drink started', 'potion');
      const page = getCurrentPage();
      // move to sword position and rotate
      displayLog('step', 'should eat and drink: ', 'move to potion position')
      await page.evaluate(async () => {
        globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 4, y: 1.5, z: 2.4},
        );
      });
      await page.waitForTimeout(2000);

      // grab the potion
      displayLog('step', 'should eat and drink: ', 'grab the potion')
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isFoodAttached = await page.evaluate(async () => {
        // Todo: check potion is attached
        try {
          const attachedApp =
            globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name == 'potion',
            );
          if (attachedApp.length != 1) return false;
          const instanceId =
            globalWebaverse.playersManager.localPlayer.getAction(
              'wear',
            ).instanceId;
          return attachedApp[0].instanceId == instanceId;
        } catch (error) {
          return false;
        }
      });

      displayLog('step', 'should eat and drink: ', 'feed')
      await page.mouse.down();
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        globalWebaverse.game.menuMouseDown();
      });
      await page.waitForTimeout(5000);
      const feedResult = await page.evaluate(async () => {
        const useTime =
        globalWebaverse.playersManager.localPlayer.avatar.useTime;
        const useAnimation =
        globalWebaverse.playersManager.localPlayer.avatar.useAnimation;
        return {
          useTime,
          useAnimation,
        };
      });

      await page.evaluate(async () => {
        globalWebaverse.game.menuMouseUp();
      });
      await page.mouse.up();
      await page.waitForTimeout(2000);

      // ungrab the potion
      displayLog('step', 'should eat and drink: ', 'ungrab the potion')
      await page.keyboard.press('KeyR');
      await page.evaluate(async () => {
        globalWebaverse.game.dropSelectedApp();
      });
      await page.waitForTimeout(1000);

      displayLog('step', 'should eat and drink: ', 'move to zero position')
      await page.evaluate(async () => {
        globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      const isFoodUnAttached = await page.evaluate(async () => {
        try {
          const attachedApp =
            globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'drink',
            );
          return attachedApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      displayLog('step', 'should eat and drink: ', 'Validation checking')

      displayLog(isFoodAttached ? 'success' : 'error', 'should eat and drink: grab the potion');

      displayLog(feedResult.useTime > 0 && feedResult.useAnimation === 'drink' ? 'success' : 'error', 'should eat and drink: eat animation');

      displayLog(isFoodUnAttached ? 'success' : 'error', 'should eat and drink: ungrab the potion');

      const isSuccess = isFoodAttached && feedResult.useTime > 0 && feedResult.useAnimation === 'drink' && isFoodUnAttached

      displayLog(isSuccess ? 'passed' : 'fail', 'should eat and drink: ', 'potion');

      expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );
});
