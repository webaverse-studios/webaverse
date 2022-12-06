import {afterAll, beforeAll, describe, expect, test} from 'vitest'
import {
  launchBrowser,
  enterScene,
  closeBrowser,
  displayLog,
  totalTimeout,
  getCurrentPage,
} from '../utils/utils'

describe('should wear and use weapon', () => {
  beforeAll(async () => {
    await launchBrowser();
    // Todo: define custom functions here
    // await page.evaluate(async () => {
    // 	window.todo = () => {}
    // })
    await enterScene(
      `https://local.webaverse.com/?src=./test-e2e/scenes/test-e2e-weapon.scn`,
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
    'should wear and use weapon: sword',
    async () => {
      displayLog('section', 'should wear and use weapon: ', 'sword');
      const page = getCurrentPage();
      // move to sword position and rotate
      displayLog('step', 'should wear and use sword: ', 'move to sword position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 1.5},
        );
      });
      await page.waitForTimeout(2000);

      // grab the sword
      displayLog('step', 'should wear and use sword: ', 'grab the sword')
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isWeaponAttached = await page.evaluate(async () => {
        // Todo: check sword is attached
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'sword',
            );
          if (swordApp.length !== 1) return false;
          const instanceId =
            window.globalWebaverse.playersManager.localPlayer.getAction(
              'wear',
            ).instanceId;
          return swordApp[0].instanceId === instanceId;
        } catch (error) {
          return false;
        }
      });

      // move to front of target //NPC01
      displayLog('step', 'should wear and use sword: ', 'move to front of target')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 7.5},
        );
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.character.lookAt(
          0,
          0,
          -10,
        );
      });
      await page.waitForTimeout(2000);

      // attack
      displayLog('step', 'should wear and use sword: ', 'attack')
      await page.mouse.down();
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuMouseDown();
      });
      const currentNpcHealth = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC01',
          )[0];
          const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
          return npcApp.hitTracker.hp;
        } catch (error) {
          return 0;
        }
      });
      await page.waitForTimeout(8000);
      const attackResult = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        const useAction =
          window.globalWebaverse.playersManager.localPlayer.hasAction("use");
        const useAnimation =
          window.globalWebaverse.playersManager.localPlayer.avatar.useAnimation;
        const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
          npc => npc.name === 'NPC01',
        )[0];
        const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
        const npcHealth = npcApp.hitTracker.hp;
        return {
          useAction,
          useAnimation,
          npcHealth,
        };
      });
      await page.evaluate(async () => {
        window.globalWebaverse.game.menuMouseUp();
      });
      await page.mouse.up();
      await page.waitForTimeout(2000);

      // move to sword position
      displayLog('step', 'should wear and use sword: ', 'move to sword position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 1.5},
        );
      });
      await page.waitForTimeout(2000);

      // ungrab the sword
      displayLog('step', 'should wear and use sword: ', 'ungrab the sword')
      await page.keyboard.press('KeyR');
      await page.evaluate(async () => {
        window.globalWebaverse.game.dropSelectedApp();
      });
      await page.waitForTimeout(1000);
      const isWeaponUnAttached = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        // Todo: check sword is attached on the hand
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'sword',
            );
          return swordApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      await page.waitForTimeout(2000);
      // goto zero position
      displayLog('step', 'should wear and use sword: ', 'goto zero position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use weapon: ', 'Validation checking')

      displayLog(isWeaponAttached ? 'success' : 'error', 'should wear and use sword: ', 'grab the weapon');

      displayLog(attackResult.useAction && attackResult.useAnimation === 'combo' ? 'success' : 'error', 'should wear and use sword: ', 'weapon animation');

      displayLog(isWeaponUnAttached ? 'success' : 'error', 'should wear and use sword: ', 'ungrab the weapon');

      displayLog(attackResult.npcHealth <  currentNpcHealth ? 'success' : 'error', 'should wear and use sword: health changed');

      const isSuccess = attackResult && attackResult.useAction
                          && attackResult.useAnimation === 'combo' && isWeaponUnAttached
                          && attackResult.npcHealth <  currentNpcHealth

      displayLog(isSuccess ? 'passed' : 'fail', 'should wear and use weapon: ', 'sword');

      expect(isWeaponAttached).toBeTruthy();
      expect(attackResult.useAction).toBeTruthy();
      expect(attackResult.useAnimation).toBe('combo');
      expect(isWeaponUnAttached).toBeTruthy();
      expect(attackResult.npcHealth).toBeLessThan(currentNpcHealth);
      // expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );

  test(
    'should wear and use weapon: silsword',
    async () => {
      displayLog('section', 'should wear and use weapon: ', 'silsword');
      const page = getCurrentPage();
      // move to silsword position and rotate
      displayLog('step', 'should wear and use silsword: ', 'move to silsword position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 2, y: 1.5, z: 1.5},
        );
      });
      await page.waitForTimeout(2000);

      // grab the silsword
      displayLog('step', 'should wear and use silsword: ', 'grab the silsword')
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isWeaponAttached = await page.evaluate(async () => {
        // Todo: check silsword is attached
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'silsword',
            );
          if (swordApp.length !== 1) return false;
          const instanceId =
            window.globalWebaverse.playersManager.localPlayer.getAction(
              'wear',
            ).instanceId;
          return swordApp[0].instanceId === instanceId;
        } catch (error) {
          return false;
        }
      });

      // move to front of target //NPC01
      displayLog('step', 'should wear and use silsword: ', 'move to front of target')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 2, y: 1.5, z: 7.5},
        );
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.character.lookAt(
          2,
          0,
          -10,
        );
      });
      await page.waitForTimeout(5000);

      // attack
      displayLog('step', 'should wear and use silsword: ', 'attack')
      await page.mouse.down();
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuMouseDown();
      });
      const currentNpcHealth = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC02',
          )[0];
          const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
          return npcApp.hitTracker.hp;
        } catch (error) {
          return 0;
        }
      });
      await page.waitForTimeout(8000);
      const attackResult = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        const useAnimationCombo =
          window.globalWebaverse.playersManager.localPlayer.avatar.useAnimationCombo;
        const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
          npc => npc.name === 'NPC02',
        )[0];
        const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
        const npcHealth = npcApp.hitTracker.hp;
        return {
          useAnimationCombo,
          npcHealth,
        };
      });
      await page.evaluate(async () => {
        window.globalWebaverse.game.menuMouseUp();
      });
      await page.mouse.up();
      await page.waitForTimeout(2000);

      // move to sword position
      displayLog('step', 'should wear and use silsword: ', 'move to silsword position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 2, y: 1.5, z: 1.5},
        );
      });
      await page.waitForTimeout(5000);

      // ungrab the silsword
      displayLog('step', 'should wear and use silsword: ', 'ungrab the silsword')
      await page.keyboard.press('KeyR');
      await page.evaluate(async () => {
        window.globalWebaverse.game.dropSelectedApp();
      });
      await page.waitForTimeout(1000);

      const isWeaponUnAttached = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        // Todo: check silsword is attached on the hand
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'silsword',
            );
          return swordApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      await page.waitForTimeout(2000);
      // goto zero position
      displayLog('step', 'should wear and use silsword: ', 'goto zero position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use weapon: ', 'Validation checking')

      displayLog(isWeaponAttached ? 'success' : 'error', 'should wear and use silsword: ', 'grab the weapon');

      displayLog(attackResult.useAnimationCombo.length > 0 ? 'success' : 'error', 'should wear and use silsword: ', 'weapon animation');

      displayLog(isWeaponUnAttached ? 'success' : 'error', 'should wear and use silsword: ', 'ungrab the weapon');

      displayLog(attackResult.npcHealth <  currentNpcHealth ? 'success' : 'error', 'should wear and use sword: health changed');

      const isSuccess = isWeaponAttached 
                          && attackResult.useAnimationCombo.length > 0
                          && isWeaponUnAttached
                          && attackResult.npcHealth <  currentNpcHealth

      displayLog(isSuccess ? 'passed' : 'fail', 'should wear and use weapon: ', 'silsword');

      expect(isWeaponAttached).toBeTruthy();
      expect(attackResult.useAnimationCombo.length).toBeGreaterThan(0);
      expect(isWeaponUnAttached).toBeTruthy();
      expect(attackResult.npcHealth).toBeLessThan(currentNpcHealth);
      // expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );

  test(
    'should wear and use weapon: pistol',
    async () => {
      displayLog('section', 'should wear and use weapon: ', 'pistol');
      const page = getCurrentPage();
      // move to silsword position and rotate
      displayLog('step', 'should wear and use pistol: ', 'move to pistol position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 4, y: 1.5, z: 1.9},
        );
      });
      await page.waitForTimeout(2000);

      // grab the pistol
      displayLog('step', 'should wear and use pistol: ', 'grab the pistol')
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isWeaponAttached = await page.evaluate(async () => {
        // Todo: check pistol is attached
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'pistol',
            );
          if (swordApp.length !== 1) return false;
          const instanceId =
            window.globalWebaverse.playersManager.localPlayer.getAction(
              'wear',
            ).instanceId;
          return swordApp[0].instanceId === instanceId;
        } catch (error) {
          return false;
        }
      });

      // move to front of target //NPC01
      displayLog('step', 'should wear and use pistol: ', 'move to front of target')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 3.85, y: 1.5, z: 8.5},
        );
      });
      await page.waitForTimeout(5000);

      const currentNpcHealth = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC03',
          )[0];
          const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
          return npcApp.hitTracker.hp;
        } catch (error) {
          return 0;
        }
      });

      displayLog('step', 'should wear and use pistol: ', 'crouch to front of target')
      await page.keyboard.down('ControlLeft');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(100);
      await page.keyboard.up('ControlLeft');
      await page.keyboard.up('KeyC');
      await page.waitForTimeout(100);

      const playerCrouchAction = await page.evaluate(async () => {
        return window.globalWebaverse.playersManager.localPlayer.hasAction("crouch");
      });

      // attack
      displayLog('step', 'should wear and use pistol: ', 'attack')
      // await page.mouse.down({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuAim();
      });

      for (let i = 0; i < 10; i++) {
        await page.mouse.down({button: 'left'});
        await page.evaluate(async () => {
          // ToDo: we should try run mouse down manually because of this issue.
          // https://github.com/puppeteer/puppeteer/issues/4562
          window.globalWebaverse.game.menuMouseDown();
        });
        await page.waitForTimeout(200);
        await page.evaluate(async () => {
          window.globalWebaverse.game.menuMouseUp();
        });
        await page.mouse.up({button: 'left'});
        await page.waitForTimeout(300);
      }

      const attackResult = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        const aimState =
          window.globalWebaverse.playersManager.localPlayer.avatar.aimState;
        const aimAction =
          window.globalWebaverse.playersManager.localPlayer.hasAction("aim");
        const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
          npc => npc.name === 'NPC03',
        )[0];
        const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
        const npcHealth = npcApp.hitTracker.hp;
        return {
          aimState,
          aimAction,
          npcHealth,
        };
      });

      // await page.mouse.up({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuUnaim();
      });

      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use pistol: ', 'crouch to front of target')
      await page.keyboard.down('ControlLeft');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(100);
      await page.keyboard.up('ControlLeft');
      await page.keyboard.up('KeyC');
      await page.waitForTimeout(100);

      // move to sword position
      displayLog('step', 'should wear and use pistol: ', 'move to pistol position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 4, y: 1.5, z: 1.5},
        );
      });
      await page.waitForTimeout(5000);

      // ungrab the pistol
      displayLog('step', 'should wear and use pistol: ', 'ungrab the pistol')
      await page.keyboard.press('KeyR');
      await page.evaluate(async () => {
        window.globalWebaverse.game.dropSelectedApp();
      });
      await page.waitForTimeout(1000);

      const isWeaponUnAttached = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        // Todo: check pistol is attached on the hand
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'pistol',
            );
          return swordApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      await page.waitForTimeout(2000);
      // goto zero position
      displayLog('step', 'should wear and use pistol: ', 'goto zero position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use weapon: ', 'Validation checking')

      displayLog(isWeaponAttached ? 'success' : 'error', 'should wear and use pistol: ', 'grab the weapon');

      displayLog(playerCrouchAction ? 'success' : 'error', 'should wear and use pistol: ', 'crounch');

      displayLog(attackResult.aimState && attackResult.aimAction  ? 'success' : 'error', 'should wear and use pistol: ', 'weapon aim');

      displayLog(isWeaponUnAttached ? 'success' : 'error', 'should wear and use pistol: ', 'ungrab the weapon');

      displayLog(attackResult.npcHealth <  currentNpcHealth ? 'success' : 'error', 'should wear and use pistol: health changed');

      const isSuccess = isWeaponAttached 
                          && playerCrouchAction 
                          && attackResult.aimState && attackResult.aimAction
                          && isWeaponUnAttached
                          && attackResult.npcHealth <  currentNpcHealth

      displayLog(isSuccess ? 'passed' : 'fail', 'should wear and use weapon: ', 'pistol');

      expect(isWeaponAttached).toBeTruthy();
      expect(playerCrouchAction).toBeTruthy();
      expect(attackResult.aimState).toBeTruthy();
      expect(attackResult.aimAction).toBeTruthy();
      expect(isWeaponUnAttached).toBeTruthy();
      expect(attackResult.npcHealth).toBeLessThan(currentNpcHealth);
      // expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );

  test(
    'should wear and use weapon: machine-gun',
    async () => {
      displayLog('section', 'should wear and use weapon: ', 'machine-gun');
      const page = getCurrentPage();
      // move to silsword position and rotate
      displayLog('step', 'should wear and use machine-gun: ', 'move to machine-gun position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 6, y: 1.5, z: 1.9},
        );
      });
      await page.waitForTimeout(2000);

      // grab the pistol
      displayLog('step', 'should wear and use machine-gun: ', 'grab the machine-gun')
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isWeaponAttached = await page.evaluate(async () => {
        // Todo: check machine-gun is attached
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'Thompson',
            );
          if (swordApp.length !== 1) return false;
          const instanceId =
            window.globalWebaverse.playersManager.localPlayer.getAction(
              'wear',
            ).instanceId;
          return swordApp[0].instanceId === instanceId;
        } catch (error) {
          return false;
        }
      });

      // move to front of target //NPC04
      displayLog('step', 'should wear and use machine-gun: ', 'move to front of target')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 5.85, y: 1.5, z: 8.5},
        );
      });
      await page.waitForTimeout(5000);

      const currentNpcHealth = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC04',
          )[0];
          const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
          return npcApp.hitTracker.hp;
        } catch (error) {
          return 0;
        }
      });

      displayLog('step', 'should wear and use machine-gun: ', 'crouch to front of target')
      await page.keyboard.down('ControlLeft');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(100);
      await page.keyboard.up('ControlLeft');
      await page.keyboard.up('KeyC');
      await page.waitForTimeout(100);

      const playerCrouchAction = await page.evaluate(async () => {
        return window.globalWebaverse.playersManager.localPlayer.hasAction("crouch");
      });

      // attack
      displayLog('step', 'should wear and use machine-gun: ', 'attack')
      // await page.mouse.down({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuAim();
      });

      await page.mouse.down();
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuMouseDown();
      });
      await page.waitForTimeout(5000);
      await page.evaluate(async () => {
        window.globalWebaverse.game.menuMouseUp();
      });
      await page.mouse.up();

      const attackResult = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        const aimState =
          window.globalWebaverse.playersManager.localPlayer.avatar.aimState;
        const aimAction =
          window.globalWebaverse.playersManager.localPlayer.hasAction("aim");
        const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
          npc => npc.name === 'NPC04',
        )[0];
        const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
        const npcHealth = npcApp.hitTracker.hp;
        return {
          aimState,
          aimAction,
          npcHealth,
        };
      });

      // await page.mouse.up({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuUnaim();
      });

      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use machine-gun: ', 'crouch to front of target')
      await page.keyboard.down('ControlLeft');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(100);
      await page.keyboard.up('ControlLeft');
      await page.keyboard.up('KeyC');
      await page.waitForTimeout(100);

      // move to sword position
      displayLog('step', 'should wear and use machine-gun: ', 'move to machine-gun position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 6, y: 1.5, z: 1.5},
        );
      });
      await page.waitForTimeout(5000);

      // ungrab the machine-gun
      displayLog('step', 'should wear and use machine-gun: ', 'ungrab the machine-gun')
      await page.keyboard.press('KeyR');
      await page.evaluate(async () => {
        window.globalWebaverse.game.dropSelectedApp();
      });
      await page.waitForTimeout(1000);

      const isWeaponUnAttached = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        // Todo: check machine-gun is attached on the hand
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'Thompson',
            );
          return swordApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      await page.waitForTimeout(2000);
      // goto zero position
      displayLog('step', 'should wear and use machine-gun: ', 'goto zero position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use weapon: ', 'Validation checking')

      displayLog(isWeaponAttached ? 'success' : 'error', 'should wear and use  machine-gun: ', 'grab the weapon');

      displayLog(playerCrouchAction ? 'success' : 'error', 'should wear and use  machine-gun: ', 'crounch');

      displayLog(attackResult.aimState && attackResult.aimAction  ? 'success' : 'error', 'should wear and use  machine-gun: ', 'weapon aim');

      displayLog(isWeaponUnAttached ? 'success' : 'error', 'should wear and use machine-gun: ', 'ungrab the weapon');

      displayLog(attackResult.npcHealth <  currentNpcHealth ? 'success' : 'error', 'should wear and use  machine-gun: health changed');

      const isSuccess = isWeaponAttached 
                          && playerCrouchAction 
                          && attackResult.aimState && attackResult.aimAction
                          && isWeaponUnAttached
                          && attackResult.npcHealth <  currentNpcHealth

      displayLog(isSuccess ? 'passed' : 'fail', 'should wear and use weapon: ', ' machine-gun');

      expect(isWeaponAttached).toBeTruthy();
      expect(playerCrouchAction).toBeTruthy();
      expect(attackResult.aimState).toBeTruthy();
      expect(attackResult.aimAction).toBeTruthy();
      expect(isWeaponUnAttached).toBeTruthy();
      expect(attackResult.npcHealth).toBeLessThan(currentNpcHealth);
      // expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );

  test(
    'should wear and use weapon: uzi',
    async () => {
      displayLog('section', 'should wear and use weapon: ', 'uzi');
      const page = getCurrentPage();
      // move to silsword position and rotate
      displayLog('step', 'should wear and use uzi: ', 'move to uzi position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 8, y: 1.5, z: 1.9},
        );
      });
      await page.waitForTimeout(2000);

      // grab the pistol
      displayLog('step', 'should wear and use uzi: ', 'grab the uzi')
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isWeaponAttached = await page.evaluate(async () => {
        // Todo: check uzi is attached
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'Uzi',
            );
          if (swordApp.length !== 1) return false;
          const instanceId =
            window.globalWebaverse.playersManager.localPlayer.getAction(
              'wear',
            ).instanceId;
          return swordApp[0].instanceId === instanceId;
        } catch (error) {
          return false;
        }
      });

      // move to front of target //NPC05
      displayLog('step', 'should wear and use uzi: ', 'move to front of target')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 7.85, y: 1.5, z: 8.5},
        );
      });
      await page.waitForTimeout(5000);

      const currentNpcHealth = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC05',
          )[0];
          const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
          return npcApp.hitTracker.hp;
        } catch (error) {
          return 0;
        }
      });

      displayLog('step', 'should wear and use uzi: ', 'crouch to front of target')
      await page.keyboard.down('ControlLeft');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(100);
      await page.keyboard.up('ControlLeft');
      await page.keyboard.up('KeyC');
      await page.waitForTimeout(100);

      const playerCrouchAction = await page.evaluate(async () => {
        return window.globalWebaverse.playersManager.localPlayer.hasAction("crouch");
      });

      // attack
      displayLog('step', 'should wear and use uzi: ', 'attack')
      // await page.mouse.down({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuAim();
      });

      await page.mouse.down();
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuMouseDown();
      });
      await page.waitForTimeout(5000);
      await page.evaluate(async () => {
        window.globalWebaverse.game.menuMouseUp();
      });
      await page.mouse.up();

      const attackResult = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        const aimState =
          window.globalWebaverse.playersManager.localPlayer.avatar.aimState;
        const aimAction =
          window.globalWebaverse.playersManager.localPlayer.hasAction("aim");
        const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
          npc => npc.name === 'NPC05',
        )[0];
        const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
        const npcHealth = npcApp.hitTracker.hp;
        return {
          aimState,
          aimAction,
          npcHealth,
        };
      });

      // await page.mouse.up({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuUnaim();
      });

      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use uzi: ', 'crouch to front of target')
      await page.keyboard.down('ControlLeft');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(100);
      await page.keyboard.up('ControlLeft');
      await page.keyboard.up('KeyC');
      await page.waitForTimeout(100);

      // move to sword position
      displayLog('step', 'should wear and use uzi: ', 'move to uzi position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 8, y: 1.5, z: 1.5},
        );
      });
      await page.waitForTimeout(5000);

      // ungrab the uzi
      displayLog('step', 'should wear and use uzi: ', 'ungrab the uzi')
      await page.keyboard.press('KeyR');
      await page.evaluate(async () => {
        window.globalWebaverse.game.dropSelectedApp();
      });
      await page.waitForTimeout(1000);

      const isWeaponUnAttached = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        // Todo: check uzi is attached on the hand
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'Uzi',
            );
          return swordApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      await page.waitForTimeout(2000);
      // goto zero position
      displayLog('step', 'should wear and use uzi: ', 'goto zero position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use weapon: ', 'Validation checking')

      displayLog(isWeaponAttached ? 'success' : 'error', 'should wear and use  uzi: ', 'grab the weapon');

      displayLog(playerCrouchAction ? 'success' : 'error', 'should wear and use uzi: ', 'crounch');

      displayLog(attackResult.aimState && attackResult.aimAction  ? 'success' : 'error', 'should wear and use uzi: ', 'weapon aim');

      displayLog(isWeaponUnAttached ? 'success' : 'error', 'should wear and use uzi: ', 'ungrab the weapon');

      displayLog(attackResult.npcHealth <  currentNpcHealth ? 'success' : 'error', 'should wear and use uzi: health changed');

      const isSuccess = isWeaponAttached 
                          && playerCrouchAction
                          && attackResult.aimState && attackResult.aimAction
                          && isWeaponUnAttached
                          && attackResult.npcHealth <  currentNpcHealth

      displayLog(isSuccess ? 'passed' : 'fail', 'should wear and use weapon: ', 'uzi');

      expect(isWeaponAttached).toBeTruthy();
      expect(playerCrouchAction).toBeTruthy();
      expect(attackResult.aimState).toBeTruthy();
      expect(attackResult.aimAction).toBeTruthy();
      expect(isWeaponUnAttached).toBeTruthy();
      expect(attackResult.npcHealth).toBeLessThan(currentNpcHealth);
      // expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );

  test(
    'should wear and use weapon: bow',
    async () => {
      displayLog('section', 'should wear and use weapon: ', 'bow');
      const page = getCurrentPage();
      // move to silsword position and rotate
      displayLog('step', 'should wear and use bow: ', 'move to bow position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: -2, y: 1.5, z: 1.9},
        );
      });
      await page.waitForTimeout(2000);

      // grab the bow
      displayLog('step', 'should wear and use bow: ', 'grab the bow')
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isWeaponAttached = await page.evaluate(async () => {
        // Todo: check bow is attached
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'bow',
            );
          if (swordApp.length !== 1) return false;
          const instanceId =
            window.globalWebaverse.playersManager.localPlayer.getAction(
              'wear',
            ).instanceId;
          return swordApp[0].instanceId === instanceId;
        } catch (error) {
          return false;
        }
      });

      // move to front of target //NPC01
      displayLog('step', 'should wear and use bow: ', 'move to front of target')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: -2.15, y: 1.5, z: 8.8},
        );
      });
      await page.waitForTimeout(5000);

      const currentNpcHealth = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC06',
          )[0];
          const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
          return npcApp.hitTracker.hp;
        } catch (error) {
          return 0;
        }
      });

      displayLog('step', 'should wear and use bow: ', 'crouch to front of target')
      await page.keyboard.down('ControlLeft');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(100);
      await page.keyboard.up('ControlLeft');
      await page.keyboard.up('KeyC');
      await page.waitForTimeout(100);

      const playerCrouchAction = await page.evaluate(async () => {
        return window.globalWebaverse.playersManager.localPlayer.hasAction("crouch");
      });

      // attack
      displayLog('step', 'should wear and use bow: ', 'attack')
      // await page.mouse.down({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuAim();
      });

      for (let i = 0; i < 3; i++) {
        await page.mouse.down({button: 'left'});
        await page.evaluate(async () => {
          // ToDo: we should try run mouse down manually because of this issue.
          // https://github.com/puppeteer/puppeteer/issues/4562
          window.globalWebaverse.game.menuMouseDown();
        });
        await page.waitForTimeout(8000);
        await page.evaluate(async () => {
          window.globalWebaverse.game.menuMouseUp();
        });
        await page.mouse.up({button: 'left'});
        await page.waitForTimeout(300);
      }

      const attackResult = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        const aimState =
          window.globalWebaverse.playersManager.localPlayer.avatar.aimState;
        const aimAction =
          window.globalWebaverse.playersManager.localPlayer.hasAction("aim");
        const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
          npc => npc.name === 'NPC06',
        )[0];
        const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
        const npcHealth = npcApp.hitTracker.hp;
        return {
          aimState,
          aimAction,
          npcHealth,
        };
      });

      // await page.mouse.up({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuUnaim();
      });

      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use bow: ', 'crouch to front of target')
      await page.keyboard.down('ControlLeft');
      await page.keyboard.down('KeyC');
      await page.waitForTimeout(100);
      await page.keyboard.up('ControlLeft');
      await page.keyboard.up('KeyC');
      await page.waitForTimeout(100);

      // move to sword position
      displayLog('step', 'should wear and use bow: ', 'move to bow position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: -2, y: 1.5, z: 1.5},
        );
      });
      await page.waitForTimeout(5000);

      // ungrab the bow
      displayLog('step', 'should wear and use bow: ', 'ungrab the bow')
      await page.keyboard.press('KeyR');
      await page.evaluate(async () => {
        window.globalWebaverse.game.dropSelectedApp();
      });
      await page.waitForTimeout(1000);

      const isWeaponUnAttached = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        // Todo: check bow is attached on the hand
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'bow',
            );
          return swordApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      await page.waitForTimeout(2000);
      // goto zero position
      displayLog('step', 'should wear and use bow: ', 'goto zero position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use weapon: ', 'Validation checking')

      displayLog(isWeaponAttached ? 'success' : 'error', 'should wear and use  bow: ', 'grab the weapon');

      displayLog(playerCrouchAction ? 'success' : 'error', 'should wear and use bow: ', 'crounch');

      displayLog(attackResult.aimState && attackResult.aimAction  ? 'success' : 'error', 'should wear and use bow: ', 'weapon aim');

      displayLog(isWeaponUnAttached ? 'success' : 'error', 'should wear and use bow: ', 'ungrab the weapon');

      displayLog(attackResult.npcHealth <  currentNpcHealth ? 'success' : 'error', 'should wear and use bow: health changed');

      const isSuccess = isWeaponAttached 
                          && playerCrouchAction 
                          && attackResult.aimState && attackResult.aimAction
                          && isWeaponUnAttached
                          && attackResult.npcHealth <  currentNpcHealth

      displayLog(isSuccess ? 'passed' : 'fail', 'should wear and use weapon: ', 'bow');

      expect(isWeaponAttached).toBeTruthy();
      expect(playerCrouchAction).toBeTruthy();
      expect(attackResult.aimState).toBeTruthy();
      expect(attackResult.aimAction).toBeTruthy();
      expect(isWeaponUnAttached).toBeTruthy();
      expect(attackResult.npcHealth).toBeLessThan(currentNpcHealth);
      // expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );

  test(
    'should wear and use weapon: rpg',
    async () => {
      displayLog('section', 'should wear and use weapon: ', 'rpg');
      const page = getCurrentPage();
      // move to silsword position and rotate
      displayLog('step', 'should wear and use rpg: ', 'move to rpg position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: -4, y: 1.5, z: 1.9},
        );
      });
      await page.waitForTimeout(2000);

      // grab the rpg
      displayLog('step', 'should wear and use rpg: ', 'grab the rpg')
      await page.keyboard.down('KeyE');
      await page.waitForTimeout(4000);
      await page.keyboard.up('KeyE');
      await page.waitForTimeout(2000);
      const isWeaponAttached = await page.evaluate(async () => {
        // Todo: check rpg is attached
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'rpg',
            );
          if (swordApp.length !== 1) return false;
          const instanceId =
            window.globalWebaverse.playersManager.localPlayer.getAction(
              'wear',
            ).instanceId;
          return swordApp[0].instanceId === instanceId;
        } catch (error) {
          return false;
        }
      });

      // move to front of target //NPC01
      displayLog('step', 'should wear and use rpg: ', 'move to front of target')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: -4.15, y: 1.5, z: 12},
        );
      });
      await page.waitForTimeout(5000);

      const currentNpcHealth = await page.evaluate(async () => {
        try {
          const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
            npc => npc.name === 'NPC07',
          )[0];
          const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
          return npcApp.hitTracker.hp;
        } catch (error) {
          return 0;
        }
      });

      // attack
      displayLog('step', 'should wear and use rpg: ', 'attack')
      // await page.mouse.down({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuAim();
      });

      for (let i = 0; i < 3; i++) {
        await page.mouse.down({button: 'left'});
        await page.evaluate(async () => {
          // ToDo: we should try run mouse down manually because of this issue.
          // https://github.com/puppeteer/puppeteer/issues/4562
          window.globalWebaverse.game.menuMouseDown();
        });
        await page.waitForTimeout(5000);
        await page.evaluate(async () => {
          window.globalWebaverse.game.menuMouseUp();
        });
        await page.mouse.up({button: 'left'});
        await page.waitForTimeout(1000);
      }

      const attackResult = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        const aimState =
          window.globalWebaverse.playersManager.localPlayer.avatar.aimState;
        const aimAction =
          window.globalWebaverse.playersManager.localPlayer.hasAction("aim");
        const currentNpc = window.globalWebaverse.npcManager.npcs.filter(
          npc => npc.name === 'NPC07',
        )[0];
        const npcApp = window.globalWebaverse.npcManager.getAppByNpc(currentNpc);
        const npcHealth = npcApp.hitTracker.hp;
        return {
          aimState,
          aimAction,
          npcHealth,
        };
      });

      // await page.mouse.up({button: "right"});
      await page.evaluate(async () => {
        // ToDo: we should try run mouse down manually because of this issue.
        // https://github.com/puppeteer/puppeteer/issues/4562
        window.globalWebaverse.game.menuUnaim();
      });
      await page.waitForTimeout(2000);

      // move to sword position
      displayLog('step', 'should wear and use rpg: ', 'move to rpg position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: -4, y: 1.5, z: 1.5},
        );
      });
      await page.waitForTimeout(5000);

      // ungrab the rpg
      displayLog('step', 'should wear and use rpg: ', 'ungrab the rpg')
      await page.keyboard.press('KeyR');
      await page.evaluate(async () => {
        window.globalWebaverse.game.dropSelectedApp();
      });
      await page.waitForTimeout(1000);

      const isWeaponUnAttached = await page.evaluate(async () => {
        // Todo: check player attack animation work
        // Todo: check npc health damaged
        // Todo: we might have more option to validation
        // Todo: check rpg is attached on the hand
        try {
          const swordApp =
            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
              app => app.name === 'rpg',
            );
          return swordApp.length === 0;
        } catch (error) {
          return false;
        }
      });

      await page.waitForTimeout(2000);
      // goto zero position
      displayLog('step', 'should wear and use rpg: ', 'goto zero position')
      await page.evaluate(async () => {
        window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
          {x: 0, y: 1.5, z: 0},
        );
      });
      await page.waitForTimeout(2000);

      displayLog('step', 'should wear and use weapon: ', 'Validation checking')

      displayLog(isWeaponAttached ? 'success' : 'error', 'should wear and use rpg: ', 'grab the weapon');


      displayLog(attackResult.aimState && attackResult.aimAction  ? 'success' : 'error', 'should wear and use rpg: ', 'weapon aim');

      displayLog(isWeaponUnAttached ? 'success' : 'error', 'should wear and use rpg: ', 'ungrab the weapon');

      // displayLog(attackResult.npcHealth <  currentNpcHealth ? 'success' : 'error', 'should wear and use rpg: health changed');

      const isSuccess = isWeaponAttached 
                          && attackResult.aimState && attackResult.aimAction
                          && isWeaponUnAttached
                          // && attackResult.npcHealth <  currentNpcHealth

      displayLog(isSuccess ? 'passed' : 'fail', 'should wear and use weapon: ', 'rpg');

      expect(isWeaponAttached).toBeTruthy();
      expect(attackResult.aimState).toBeTruthy();
      expect(attackResult.aimAction).toBeTruthy();
      expect(isWeaponUnAttached).toBeTruthy();
      // expect(attackResult.npcHealth).toBeLessThan(currentNpcHealth);
      // expect(isSuccess).toBeTruthy();
    },
    totalTimeout,
  );
});