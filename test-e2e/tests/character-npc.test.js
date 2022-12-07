import {afterAll, beforeAll, describe, expect, test} from 'vitest'
import {
  launchBrowser,
  enterScene,
  closeBrowser,
  displayLog,
  totalTimeout,
  getCurrentPage,
} from '../utils/utils'

describe('should npc player works', () => {
  beforeAll(async () => {
    await launchBrowser();
    // Todo: define custom functions here
    // await page.evaluate(async () => {
    // 	window.todo = () => {}
    // })
    await enterScene(
      `https://local.webaverse.com/?src=./test-e2e/scenes/test-e2e-npc.scn`,
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
    'should npc player works: follow',
    async () => {
      displayLog('section', 'should npc player works: ', 'follow');
      const page = getCurrentPage();
      displayLog('step', 'should npc player works: ', 'go to npc position');
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: -24.5},
        );
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.character.lookAt(
          0,
          0,
          -30,
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should npc player works: ', 'use npc');
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isNpcAttached = await page.evaluate(async () => {
        // Todo: check npc is attached
        try {
          const attachedApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'application/npc',
            );
          return attachedApp.length > 0;
        } catch (error) {
          return false;
        }
      });

      const firstWalkPosition = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC01',
          )[0];
          return currentNpc.position;
        } catch (error) {
          return {x: 0, y: 0, z: 0};
        }
      });

      // Todo: simulate walk
      displayLog('step', 'should npc player works: ', 'player start walk');
      await page.keyboard.down('KeyS');
      await page.waitForTimeout(3000);

      const npcWalk = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC01',
          )[0];
          const avatar = currentNpc.avatar;
          const currentSpeed = avatar.velocity.length();
          const idleWalkFactor = avatar.idleWalkFactor;
          const currentPosition = currentNpc.position;
          return {
            currentSpeed,
            idleWalkFactor,
            currentPosition,
          };
        } catch (error) {
          return {
            currentSpeed: 0,
            idleWalkFactor: 0,
            currentPosition: {x: 0, y: 0, z: 0},
          };
        }
      });

      await page.keyboard.up('KeyS');
      await page.waitForTimeout(1000);

      // run npc
      const firstRunPosition = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC01',
          )[0];
          return currentNpc.position;
        } catch (error) {
          return {x: 0, y: 0, z: 0};
        }
      });

      // Todo: simulate run
      displayLog('step', 'should npc player works: ', 'player start run');
      await page.keyboard.down('ShiftRight');
      await page.waitForTimeout(500);
      await page.keyboard.down('KeyS');
      await page.waitForTimeout(3000);

      const npcRun = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC01',
          )[0];
          const avatar = currentNpc.avatar;
          const currentSpeed = avatar.velocity.length();
          const walkRunFactor = avatar.walkRunFactor;
          const currentPosition = currentNpc.position;
          return {
            currentSpeed,
            walkRunFactor,
            currentPosition,
          };
        } catch (error) {
          return {
            currentSpeed: 0,
            walkRunFactor: 0,
            currentPosition: {x: 0, y: 0, z: 0},
          };
        }
      });

      await page.keyboard.up('KeyS');
      await page.keyboard.up('ShiftRight');
      await page.waitForTimeout(5000);

      // unuse npc
      displayLog('step', 'should npc player works: ', 'move to near position');
      const currentNpcPosition = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC01',
          )[0];
          return currentNpc.position;
        } catch (error) {
          return {x: 0, y: 0, z: 0};
        }
      });

      await page.evaluate(async currentNpcPosition => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: currentNpcPosition.x, y: 1.5, z: currentNpcPosition.z - 0.5},
        );
      }, currentNpcPosition);

      await page.waitForTimeout(5000);

      displayLog('step', 'should npc player works: ', 'unuse npc');
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      // await page.evaluate(async () => {
      //     window.globalWebaverse.game.dropSelectedApp();
      // });
      await page.waitForTimeout(1000);

      const isNpcUnAttached = await page.evaluate(async () => {
        try {
          const attachedApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'application/npc',
            );
          return attachedApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      displayLog('step', 'should npc player works: ', 'move to zero position');
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should npc player works: ', 'Validation checking')

      displayLog(isNpcAttached ? 'success' : 'error', 'should npc player works: use the NPC');

      displayLog(npcWalk.currentSpeed > 0 ? 'success' : 'error', 'should npc player works: walk currentSpeed > 0');

      displayLog(npcWalk.idleWalkFactor > 0.5 ? 'success' : 'error', 'should npc player works: walk  idleWalkFactor > 0.5');

      displayLog(npcWalk.currentPosition !== firstWalkPosition? 'success' : 'error', 'should npc player works: ', 'walk moved');

      displayLog(npcRun.currentSpeed > 0.5 ? 'success' : 'error', 'should npc player works: run currentSpeed > 0.5');

      displayLog(npcRun.walkRunFactor > 0.5 ? 'success' : 'error', 'should npc player works: run walkRunFactor > 0.5');

      displayLog(npcRun.currentPosition !== firstRunPosition? 'success' : 'error', 'should npc player works: ', 'run moved');

      displayLog(isNpcUnAttached ? 'success' : 'error', 'should npc player works: unuse the NPC');

      const isSuccess = isNpcAttached && npcWalk.currentSpeed > 0 && npcWalk.idleWalkFactor > 0.5
                          && npcWalk.currentPosition !== firstWalkPosition && npcRun.currentSpeed > 0.5
                          && npcRun.currentSpeed > 0.5 && npcRun.walkRunFactor > 0.5 && npcRun.currentPosition !== firstRunPosition
                          && isNpcUnAttached

      displayLog(isSuccess ? 'passed' : 'fail', 'should npc player works: ', 'movement');

      expect(isNpcAttached).toBeTruthy();
      expect(npcWalk.currentSpeed).toBeGreaterThan(0);
      expect(npcWalk.idleWalkFactor).toBeGreaterThan(0);
      expect(npcWalk.currentPosition !== firstWalkPosition).toBeTruthy();
      expect(npcRun.currentSpeed).toBeGreaterThan(0.5);
      expect(npcRun.walkRunFactor).toBeGreaterThan(0.5);
      expect(npcRun.currentPosition !== firstRunPosition).toBeTruthy();
      expect(isNpcUnAttached).toBeTruthy();
      // expect(isSuccess).toBeTruthy();

    },
    totalTimeout,
  );

  test(
    'should npc player works: switch the avatars',
    async () => {
      displayLog('section', 'should npc player works: ', 'switch the avatars');
      displayLog('step', 'should npc player works: ', 'move to near position');
      const page = getCurrentPage();

      await page.waitForTimeout(10000);

      let currentNpcPosition = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC01',
          )[0];
          return currentNpc.position;
        } catch (error) {
          return {x: 0, y: 0, z: 0};
        }
      });

      await page.waitForTimeout(5000);

      displayLog('step', 'should npc player works: ', 'go to npc position');
      await page.evaluate(async currentNpcPosition => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: currentNpcPosition.x, y: 1.5, z: currentNpcPosition.z},
        );
      }, currentNpcPosition);
      await page.waitForTimeout(2000);

      displayLog('step', 'should npc player works: ', 'use npc');
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isNpcAttached = await page.evaluate(async () => {
        // Todo: check npc is attached
        try {
          const attachedApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'application/npc',
            );
          return attachedApp.length > 0;
        } catch (error) {
          return false;
        }
      });

      const currentAvatarName = await page.evaluate(async () => {
        return window.globalWebaverse.playersManager.localPlayer.name;
      });

      displayLog('step', 'should npc player works: ', 'switch the avatars');
      await page.keyboard.press('KeyG');
      await page.waitForTimeout(2000);

      const switchedAvatarName = await page.evaluate(async () => {
        return window.globalWebaverse.playersManager.localPlayer.name;
      });

      displayLog('step', 'should npc player works: ', 'switch the avatars');
      await page.keyboard.press('KeyG');
      await page.waitForTimeout(2000);

      const reSwitchedAvatarName = await page.evaluate(async () => {
        return window.globalWebaverse.playersManager.localPlayer.name;
      });

      // unuse npc
      displayLog('step', 'should npc player works: ', 'move to near position');
      currentNpcPosition = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC01',
          )[0];
          return currentNpc.position;
        } catch (error) {
          return {x: 0, y: 0, z: 0};
        }
      });

      await page.evaluate(async currentNpcPosition => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: currentNpcPosition.x, y: 1.5, z: currentNpcPosition.z - 0.5},
        );
      }, currentNpcPosition);

      await page.waitForTimeout(5000);

      displayLog('step', 'should npc player works: ', 'unuse npc');
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      // await page.evaluate(async () => {
      //     window.globalWebaverse.game.dropSelectedApp();
      // });
      await page.waitForTimeout(1000);

      const isNpcUnAttached = await page.evaluate(async () => {
        try {
          const attachedApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'application/npc',
            );
          return attachedApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      displayLog('step', 'should npc player works: ', 'move to zero position');
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog(isNpcAttached ? 'success' : 'error', 'should npc player works: use the NPC');
      displayLog(switchedAvatarName !== currentAvatarName ? 'success' : 'error', 'should npc player works: switch the NPC');
      displayLog(reSwitchedAvatarName === currentAvatarName ? 'success' : 'error', 'should npc player works: switch the NPC');
      displayLog(isNpcUnAttached ? 'success' : 'error', 'should npc player works: unuse the NPC');

      const isSuccess = isNpcAttached && switchedAvatarName !== currentAvatarName
                          && reSwitchedAvatarName === currentAvatarName && isNpcUnAttached

      displayLog(isSuccess ? 'passed' : 'fail', 'should npc player works: ', 'switch');

      expect(isNpcAttached).toBeTruthy();
      expect(switchedAvatarName !== currentAvatarName).toBeTruthy();
      expect(reSwitchedAvatarName === currentAvatarName).toBeTruthy();
      expect(isNpcUnAttached).toBeTruthy();
      // expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );
});