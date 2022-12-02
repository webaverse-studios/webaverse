import {afterAll, beforeAll, describe, expect, test} from 'vitest'
import {
  launchBrowser,
  enterScene,
  closeBrowser,
  displayLog,
  totalTimeout,
  getCurrentPage,
} from '../utils/utils'

describe.only(
  'should character movement',
  () => {
    beforeAll(async () => {
      await launchBrowser();
      // Todo: define custom functions here
      // await page.evaluate(async () => {
      // 	window.todo = () => {}
      // })
      await enterScene(
        `https://local.webaverse.com/?src=./test-e2e/scenes/test-e2e-empty.scn`,
      );
    }, totalTimeout);

    afterAll(async () => {
      await closeBrowser();
    }, totalTimeout);

    test(
      'should character loaded',
      async () => {
        displayLog('section', 'should character loaded: start');
        const avatarFlag = await getCurrentPage().evaluate(async () => {
          const localPlayer = window.globalWebaverse.playersManager.localPlayer;
          const isPlayerAvatarApp = !!localPlayer.getAvatarApp();
          const isBound = localPlayer.isBound();
          // const isLocalPlayer = localPlayer.isLocalPlayer;
          const isCharacterSfx =
            localPlayer.avatarCharacterSfx && !!localPlayer.avatarCharacterSfx.character;
          const isCharacterHups =
            localPlayer.characterHups && !!localPlayer.characterHups.character;
          const isCharacterFx =
            localPlayer.avatarCharacterFx && !!localPlayer.avatarCharacterFx.character;
          const isCharacterHitter =
            localPlayer.characterHitter && !!localPlayer.characterHitter.character;
          const isCharacterFace =
            localPlayer.avatarFace &&
            !!localPlayer.avatarFace.character;
          const isCharacterPhysic =
            localPlayer.characterPhysics &&
            localPlayer.characterPhysics.characterHeight > 0 &&
            localPlayer.characterPhysics.lastGrounded;
          return {
            isPlayerAvatarApp,
            isBound,
            // isLocalPlayer,
            isCharacterSfx,
            isCharacterHups,
            isCharacterFx,
            isCharacterHitter,
            isCharacterFace,
            isCharacterPhysic,
          };
        });
        displayLog('step', 'should character loaded: ', 'Validation checking')

        displayLog(avatarFlag.isPlayerAvatarApp? 'success' : 'error', 'Should character loaded', 'isPlayerAvatarApp');
        displayLog(avatarFlag.isBound? 'success' : 'error', 'Should character loaded', 'isBound');
        displayLog(avatarFlag.isCharacterSfx? 'success' : 'error', 'Should character loaded', 'isCharacterSfx');
        displayLog(avatarFlag.isCharacterHups? 'success' : 'error', 'Should character loaded', 'isCharacterHups');
        displayLog(avatarFlag.isCharacterFx? 'success' : 'error', 'Should character loaded', 'isCharacterFx');
        displayLog(avatarFlag.isCharacterHitter? 'success' : 'error', 'Should character loaded', 'isCharacterHitter');
        displayLog(avatarFlag.isCharacterFace? 'success' : 'error', 'Should character loaded', 'isCharacterFace');
        displayLog(avatarFlag.isCharacterPhysic? 'success' : 'error', 'Should character loaded', 'isCharacterPhysic');

        const isSuccess = avatarFlag.isPlayerAvatarApp && avatarFlag.isBound
                          && avatarFlag.isCharacterSfx && avatarFlag.isCharacterHups
                          && avatarFlag.isCharacterFx && avatarFlag.isCharacterHitter
                          && avatarFlag.isCharacterFace && avatarFlag.isCharacterPhysic

        displayLog(isSuccess ? 'passed' : 'fail', 'should character loaded: ', 'avatar');
        
        expect(avatarFlag.isPlayerAvatarApp).toBeTruthy();
        expect(avatarFlag.isBound).toBeTruthy();
        expect(avatarFlag.isCharacterSfx).toBeTruthy();
        expect(avatarFlag.isCharacterHups).toBeTruthy();
        expect(avatarFlag.isCharacterFx).toBeTruthy();
        expect(avatarFlag.isCharacterHitter).toBeTruthy();
        expect(avatarFlag.isCharacterFace).toBeTruthy();
        expect(avatarFlag.isCharacterPhysic).toBeTruthy();
        // expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );

    test(
      'should character movement: walk',
      async () => {
        displayLog('section', 'should character movement: ', 'walk');
        const page = getCurrentPage();
        const firstPosition = await page.evaluate(async () => {
          return window.globalWebaverse.playersManager.localPlayer.position;
        });

        displayLog('step', 'should character movement: ', 'moving');
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
            // let isCorrectMove = true;
            // if (key === 'KeyW') {
            //   if (currentPosition.x <= firstPosition.x) isCorrectMove = false;
            // } else if (key === 'KeyA') {
            //   if (currentPosition.z >= firstPosition.z) isCorrectMove = false;
            // } else if (key === 'KeyS') {
            //   if (currentPosition.x >= firstPosition.x) isCorrectMove = false;
            // } else if (key === 'KeyD') {
            //   if (currentPosition.z <= firstPosition.z) isCorrectMove = false;
            // }
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

        displayLog('step', 'should character movement: ', 'validation');

        displayLog(playerMove.currentSpeed > 0? 'success' : 'error', 'should character movement: ', 'currentSpeed > 0');
        displayLog(playerMove.idleWalkFactor > 0.5? 'success' : 'error', 'should character movement: ', 'idleWalkFactor > 0.5');
        displayLog(playerMove.currentPosition !== firstPosition? 'success' : 'error', 'should character movement: ', 'moved');
        
        const isSuccess = playerMove.currentSpeed > 0 && playerMove.idleWalkFactor > 0.5 && playerMove.currentPosition !== firstPosition
        // expect(playerMove.isCorrectMove).toBeTruthy();
        displayLog(isSuccess ? 'passed' : 'fail', 'should character movement: ', 'walk');
        
        expect(playerMove.currentSpeed).toBeGreaterThan(0);
        expect(playerMove.idleWalkFactor).toBeGreaterThan(0.5);
        expect(playerMove.currentPosition !== firstPosition).toBeTruthy();
        // expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );

    test(
      'should character movement: run',
      async () => {
        displayLog('section', 'should character movement: ', 'run');
        const page = getCurrentPage();
        const lastPosition = await page.evaluate(async () => {
          return window.globalWebaverse.playersManager.localPlayer.position;
        });

        displayLog('step', 'should character movement: ', 'running');
        const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
        const key = keys[Math.floor(Math.random() * keys.length)];
        await page.keyboard.down('ShiftRight');
        await page.waitForTimeout(100);
        await page.keyboard.down(key);
        await page.waitForTimeout(1000);
        const playerRun = await page.evaluate(async () => {
          const avatar = window.globalWebaverse.playersManager.localPlayer.avatar;
          const currentSpeed = avatar.velocity.length();
          const walkRunFactor = avatar.walkRunFactor;
          const currentPosition = window.globalWebaverse.playersManager.localPlayer.position;
          return {
            currentSpeed,
            walkRunFactor,
            currentPosition,
          };
        });
        await page.keyboard.up(key);
        await page.keyboard.up('ShiftRight');
        await page.waitForTimeout(3000);
        
        displayLog('step', 'should character movement: ', 'validation');
        displayLog(playerRun.currentSpeed > 0.5? 'success' : 'error', 'should character movement: ', 'currentSpeed > 0.5');
        displayLog(playerRun.walkRunFactor > 0.5? 'success' : 'error', 'should character movement: ', 'walkRunFactor > 0.5');
        displayLog(playerRun.currentPosition !== lastPosition? 'success' : 'error', 'should character movement: ', 'moved');
        
        const isSuccess = playerRun.currentSpeed > 0.5 && playerRun.walkRunFactor > 0.5 && playerRun.currentPosition !== lastPosition
        displayLog(isSuccess ? 'passed' : 'fail', 'should character movement: ', 'run');

        expect(playerRun.currentSpeed).toBeGreaterThan(0.5);
        expect(playerRun.walkRunFactor).toBeGreaterThan(0.5);
        expect(playerRun.currentPosition !== lastPosition).toBeTruthy();
        // expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );

    test(
      'should character movement: naruto run',
      async () => {
        displayLog('section', 'should character movement: ', 'naruto run');
        displayLog('step', 'should character movement: ', 'naruto run start');
        const page = getCurrentPage();
        await page.keyboard.down('ShiftLeft');
        await page.waitForTimeout(100);
        await page.keyboard.type('wwwwwwwwww');
        await page.waitForTimeout(3000);

        const narutoRun = await page.evaluate(async () => {
          const avatar = window.globalWebaverse.playersManager.localPlayer.avatar;
          const narutoRunAction = window.globalWebaverse.playersManager.localPlayer.hasAction("narutoRun");
          const narutoRunState = avatar.narutoRunState;
          return {
            narutoRunAction,
            narutoRunState,
          };
        });
        await page.keyboard.up('ShiftLeft');
        await page.waitForTimeout(5000);

        displayLog('step', 'should character movement: ', 'validation');
        displayLog(narutoRun.narutoRunAction? 'success' : 'error', 'should character movement: ', 'narutoRunAction');
        displayLog(narutoRun.narutoRunState? 'success' : 'error', 'should character movement: ', 'narutoRunState');
 
        const isSuccess = narutoRun.narutoRunAction && narutoRun.narutoRunState
        // expect(playerMove.isCorrectMove).toBeTruthy();
        displayLog(isSuccess ? 'passed' : 'fail', 'should character movement: ', 'naruto run');
        
        expect(narutoRun.narutoRunAction).toBeTruthy();
        expect(narutoRun.narutoRunState).toBeTruthy();
        // expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );

    test(
      'should character movement: jump',
      async () => {
        displayLog('section', 'should character movement: ', 'jump');
        displayLog('step', 'should character movement: ', 'jump start');
        const page = getCurrentPage();
        const lastPosition = await page.evaluate(async () => {
          return window.globalWebaverse.playersManager.localPlayer.position;
        });
        const isJumpFlags = [];
        // ToDO: need to repeat for get average because sometimes page.evaluate takes a few sec
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press('Space');
          await page.waitForTimeout(100);
          const isJump = await page.evaluate(async lastPosition => {
            const avatar =
              window.globalWebaverse.playersManager?.localPlayer?.avatar;
            const jumpState = avatar.jumpState;
            const jumpAction = window.globalWebaverse.playersManager?.localPlayer?.hasAction("jump");
            const currentPosition = window.globalWebaverse.playersManager.localPlayer.position;
            return (
              jumpAction &&
              jumpState &&
              currentPosition.y - lastPosition.y > 0
            );
          }, lastPosition);
          isJumpFlags.push(isJump);
          await page.waitForTimeout(2000);
        }
        await page.waitForTimeout(3000);

        displayLog('step', 'should character movement: ', 'validation');
        const isSuccess = isJumpFlags[0] || isJumpFlags[1] || isJumpFlags[2]
        displayLog(isSuccess ? 'passed' : 'fail', 'should character movement: ', 'jump');
        expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );

    test(
      'should character movement: double jump',
      async () => {
        displayLog('section', 'should character movement: ', 'double jump');
        displayLog('step', 'should character movement: ', 'double jump start');
        const page = getCurrentPage();
        const lastPosition = await page.evaluate(async () => {
          return window.globalWebaverse.playersManager.localPlayer.position;
        });
        const isDoubleJumpFlags = [];
        // ToDO: need to repeat for get average because sometimes page.evaluate takes a few sec
        for (let i = 0; i < 3; i++) {
          await page.keyboard.press('Space');
          await page.waitForTimeout(100);
          await page.keyboard.press('Space');
          await page.waitForTimeout(100);
          const isDoubleJump = await page.evaluate(async lastPosition => {
            const avatar = window.globalWebaverse.playersManager.localPlayer.avatar;
            const doubleJumpState = avatar.doubleJumpState;
            const doubleJumpAction = window.globalWebaverse.playersManager.localPlayer.hasAction('doubleJump');
            const currentPosition = window.globalWebaverse.playersManager.localPlayer.position;
            return (
              doubleJumpAction &&
              doubleJumpState &&
              currentPosition.y - lastPosition.y > 0
            );
          }, lastPosition);
          isDoubleJumpFlags.push(isDoubleJump);
          await page.waitForTimeout(5000);
        }
        await page.waitForTimeout(3000);

        displayLog('step', 'should character movement: ', 'validation');
        const isSuccess = isDoubleJumpFlags[0] || isDoubleJumpFlags[1] || isDoubleJumpFlags[2]
        displayLog(isSuccess ? 'passed' : 'fail', 'should character movement: ', 'double jump');
        expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );

    test(
      'should character movement: crouch',
      async () => {
        displayLog('section', 'should character movement: ', 'crouch');
        const page = getCurrentPage();
        const lastPosition = await page.evaluate(async () => {
          return window.globalWebaverse.playersManager.localPlayer.position;
        });
        displayLog('step', 'should character movement: ', 'crouch and move');
        await page.keyboard.down('ControlLeft');
        await page.keyboard.down('KeyC');
        await page.waitForTimeout(100);
        await page.keyboard.up('ControlLeft');
        await page.keyboard.up('KeyC');
        await page.waitForTimeout(100);
        await page.keyboard.down('KeyW');
        await page.waitForTimeout(2000);
        const playerCrouch = await page.evaluate(async () => {
          const avatar = window.globalWebaverse.playersManager.localPlayer.avatar;
          const currentSpeed = avatar.velocity.length();
          const crouchAction = window.globalWebaverse.playersManager.localPlayer.hasAction("crouch");
          const currentPosition = window.globalWebaverse.playersManager.localPlayer.position;
          return {
            currentSpeed,
            crouchAction,
            currentPosition,
          };
        });
        await page.keyboard.up('KeyW');
        await page.keyboard.down('ControlLeft');
        await page.keyboard.down('KeyC');
        await page.waitForTimeout(100);
        await page.keyboard.up('ControlLeft');
        await page.keyboard.up('KeyC');
        await page.waitForTimeout(3000);

        displayLog('step', 'should character movement: ', 'validation');
        displayLog(playerCrouch.currentSpeed > 0? 'success' : 'error', 'should character movement: ', 'currentSpeed > 0');
        displayLog(playerCrouch.crouchAction? 'success' : 'error', 'should character movement: ', 'crouchAction');
        displayLog(playerCrouch.currentPosition !== lastPosition? 'success' : 'error', 'should character movement: ', 'moved');
        
        const isSuccess = playerCrouch.currentSpeed > 0 && playerCrouch.crouchAction && playerCrouch.currentPosition !== lastPosition
        displayLog(isSuccess ? 'passed' : 'fail', 'should character movement: ', 'crouch');

        expect(playerCrouch.currentSpeed).toBeGreaterThan(0);
        expect(playerCrouch.crouchAction).toBeTruthy();
        expect(playerCrouch.currentPosition !== lastPosition).toBeTruthy();
        // expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );

    test(
      'should character movement: fly',
      async () => {
        displayLog('section', 'should character movement: ', 'fly');
        const page = getCurrentPage();
        await page.keyboard.press('KeyF');
        await page.keyboard.down('KeyW');
        await page.waitForTimeout(1000);
        const playerFly = await page.evaluate(async () => {
          const avatar = window.globalWebaverse.playersManager.localPlayer.avatar;
          const flyState = avatar.flyState;
          const flyAction = window.globalWebaverse.playersManager.localPlayer.hasAction("fly");
          return {
            flyAction,
            flyState,
          };
        });
        await page.keyboard.up('KeyW');
        await page.keyboard.press('KeyF');
        await page.waitForTimeout(3000);

        displayLog('step', 'should character movement: ', 'validation');
        displayLog(playerFly.flyAction? 'success' : 'error', 'should character movement: ', 'flyAction');
        displayLog(playerFly.flyState? 'success' : 'error', 'should character movement: ', 'flyState');
 
        const isSuccess = playerFly.flyAction && playerFly.flyState
        displayLog(isSuccess ? 'passed' : 'fail', 'should character movement: ', 'fly');
        
        expect(playerFly.flyAction).toBeTruthy();
        expect(playerFly.flyState).toBeTruthy();
        // expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );

    test(
      'should character movement: dance',
      async () => {
        displayLog('section', 'should character movement: ', 'dance');
        const page = getCurrentPage();
        await page.keyboard.down('KeyV');
        await page.waitForTimeout(2000);
        const playerDance = await page.evaluate(async () => {
          const danceAction = window.globalWebaverse.playersManager.localPlayer.hasAction("dance");;
          return {
            danceAction,
          };
        });
        await page.keyboard.up('KeyV');
        await page.waitForTimeout(3000);
        expect(playerDance.danceAction).toBeTruthy();

        displayLog('step', 'should character movement: ', 'validation');
        displayLog(playerDance.danceAction? 'success' : 'error', 'should character movement: ', 'dance');
 
        const isSuccess = playerDance.danceAction
        displayLog(isSuccess ? 'passed' : 'fail', 'should character movement: ', 'dance');
        
        expect(playerDance.danceAction).toBeTruthy();
        // expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );
  },
  totalTimeout,
);