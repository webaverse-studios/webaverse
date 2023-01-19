import {afterAll, beforeAll, describe, expect, test} from 'vitest'
import {
  launchBrowser,
  enterScene,
  closeBrowser,
  displayLog,
  totalTimeout,
  getCurrentPage,
} from '../utils/utils'

  describe('should ride vehicle', () => {
    beforeAll(async () => {
        await launchBrowser();
        // Todo: define custom functions here
        // await page.evaluate(async () => {
        // 	window.todo = () => {}
        // })
        await enterScene(
            `https://local.webaverse.com/?src=./test-e2e/scenes/test-e2e-vehicle.scn`,
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
      'should ride vehicle: hovercraft',
      async () => {
        displayLog('section', 'should ride vehicle: ', 'hovercraft');
        const page = getCurrentPage();
        // move to sword position and rotate
        displayLog('step', 'should ride vehicle: ', 'move to hovercraft position');
        await page.evaluate(async () => {
            window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
            {x: 2, y: 1.5, z: -12},
            );
        });
        await page.waitForTimeout(2000);

        // ride the hovercraft
        displayLog('step', 'should ride vehicle: ', 'ride the hovercraft');
        await page.keyboard.down('KeyE');
        await page.waitForTimeout(4000);
        await page.keyboard.up('KeyE');
        await page.waitForTimeout(2000);
        const vehicleInfo = await page.evaluate(async () => {
            // Todo: check hovercraft is attached
            try {
                const attachedApp =
                    window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
                    app => app.name === 'hovercraft',
                    );
                if (attachedApp.length !== 1) return false;
                const instanceId =
                    window.globalWebaverse.playersManager.localPlayer.getAction(
                    'wear',
                    ).instanceId;
                return {
                    isVehicleRided: attachedApp[0].instanceId === instanceId,
                    position: attachedApp[0].position,
                }
            } catch (error) {
                return {
                    isVehicleRided: false,
                    position: {x: 0, y: 0, z: 0},
                }
            }
        });

        const firstPosition = vehicleInfo.position
        const isVehicleRided = vehicleInfo.isVehicleRided
        displayLog('step', 'should ride vehicle: ', 'drive the hovercraft');
        const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
        const key = keys[Math.floor(Math.random() * keys.length)];
        await page.keyboard.down(key);
        await page.waitForTimeout(1000);
        const vehicleMove = await page.evaluate(
            async ({firstPosition, key}) => {
                try {
                    const attachedApp =
                        window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
                            app => app.name === 'hovercraft',
                        );
                    const currentPosition = attachedApp[0].position;
                    // let isCorrectMove = true;
                    // if (key === 'KeyW') {
                    // if (currentPosition.x <= firstPosition.x) isCorrectMove = false;
                    // } else if (key === 'KeyA') {
                    // if (currentPosition.z >= firstPosition.z) isCorrectMove = false;
                    // } else if (key === 'KeyS') {
                    // if (currentPosition.x >= firstPosition.x) isCorrectMove = false;
                    // } else if (key === 'KeyD') {
                    // if (currentPosition.z <= firstPosition.z) isCorrectMove = false;
                    // }
                    return {
                        currentPosition,
                        // isCorrectMove,
                    };
                } catch (error) {
                    return {
                        currentPosition: {x: 0, y: 0, z: 0},
                        isCorrectMove: false,
                    }
                }
            },
            {firstPosition, key},
        );
        await page.keyboard.up(key);
        await page.waitForTimeout(1000);

        // unride the hovercraft
        displayLog('step', 'should ride vehicle: ', 'unride the hovercraft');
        await page.keyboard.press('KeyR');
        await page.evaluate(async () => {
            window.globalWebaverse.game.dropSelectedApp();
        });

        const isVehicleUnRided = await page.evaluate(async () => {
            try {
            const attachedApp =
                window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
                app => app.name === 'hovercraft',
                );
            return attachedApp.length === 0;
            } catch (error) {
            return false;
            }
        });
        await page.waitForTimeout(1000);

        displayLog('step', 'should ride vehicle: ', 'move to zero position');
        await page.evaluate(async () => {
            window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
            {x: 0, y: 1.5, z: 0},
            );
        });
        await page.waitForTimeout(2000);

        displayLog('step', 'should ride vehicle: ', 'validation');
        displayLog(isVehicleRided? 'success' : 'error', 'should ride vehicle: ', 'isVehicleRided');
        displayLog(vehicleMove.currentPosition !== firstPosition? 'success' : 'error', 'should ride vehicle: ', 'moved');
        displayLog(isVehicleUnRided? 'success' : 'error', 'should ride vehicle: ', 'isVehicleUnRided');

        const isSuccess = isVehicleRided && vehicleMove.currentPosition !== firstPosition && isVehicleUnRided
        displayLog(isSuccess ? 'passed' : 'fail', 'should ride vehicle: ', 'hovercraft');
        
        expect(isVehicleRided).toBeTruthy();
        expect(vehicleMove.currentPosition !== firstPosition).toBeTruthy();
        expect(isVehicleUnRided).toBeTruthy();
        // expect(isSuccess).toBeTruthy();
      },
      totalTimeout,
    );

    test(
        'should ride vehicle: dragon',
        async () => {
            displayLog('section', 'should ride vehicle: ', 'dragon');
            const page = getCurrentPage();
            // move to sword position and rotate
            displayLog('step', 'should ride vehicle: ', 'move to dragon position');
            await page.evaluate(async () => {
                window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
                {x: 2, y: 1.5, z: 12},
                );
            });
            await page.waitForTimeout(2000);

            // ride the dragon
            displayLog('step', 'should ride vehicle: ', 'ride the dragon');
            await page.keyboard.down('KeyE');
            await page.waitForTimeout(4000);
            await page.keyboard.up('KeyE');
            await page.waitForTimeout(2000);
            const vehicleInfo = await page.evaluate(async () => {
                // Todo: check dragon is attached
                try {
                    const attachedApp =
                        window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
                        app => app.name === 'dragon-mount',
                        );
                    if (attachedApp.length !== 1) return false;
                    const instanceId =
                        window.globalWebaverse.playersManager.localPlayer.getAction(
                        'wear',
                        ).instanceId;
                    return {
                        isVehicleRided: attachedApp[0].instanceId === instanceId,
                        position: attachedApp[0].position,
                    }
                } catch (error) {
                    return {
                        isVehicleRided: false,
                        position: {x: 0, y: 0, z: 0},
                    }
                }
            });

            const firstPosition = vehicleInfo.position
            const isVehicleRided = vehicleInfo.isVehicleRided

            displayLog('step', 'should ride vehicle: ', 'drive the dragon');
            const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
            const key = keys[Math.floor(Math.random() * keys.length)];
            await page.keyboard.down(key);
            await page.waitForTimeout(1000);
            const vehicleMove = await page.evaluate(
                async ({firstPosition, key}) => {
                    try {
                        const attachedApp =
                            window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
                                app => app.name === 'dragon-mount',
                            );
                        const currentPosition = attachedApp[0].position;
                        // let isCorrectMove = true;
                        // if (key === 'KeyW') {
                        // if (currentPosition.x <= firstPosition.x) isCorrectMove = false;
                        // } else if (key === 'KeyA') {
                        // if (currentPosition.z >= firstPosition.z) isCorrectMove = false;
                        // } else if (key === 'KeyS') {
                        // if (currentPosition.x >= firstPosition.x) isCorrectMove = false;
                        // } else if (key === 'KeyD') {
                        // if (currentPosition.z <= firstPosition.z) isCorrectMove = false;
                        // }
                        return {
                            currentPosition,
                            // isCorrectMove,
                        };
                    } catch (error) {
                        return {
                            currentPosition: {x: 0, y: 0, z: 0},
                            isCorrectMove: false,
                        }
                    }
                },
                {firstPosition, key},
            );
            await page.keyboard.up(key);
            await page.waitForTimeout(1000);

            // unride the dragon
            displayLog('step', 'should ride vehicle: ', 'unride the dragon');
            await page.keyboard.press('KeyR');
            await page.evaluate(async () => {
                window.globalWebaverse.game.dropSelectedApp();
            });

            const isVehicleUnRided = await page.evaluate(async () => {
                try {
                const attachedApp =
                    window.globalWebaverse.playersManager.localPlayer.appManager.apps.filter(
                    app => app.name === 'dragon-mount',
                    );
                return attachedApp.length === 0;
                } catch (error) {
                return false;
                }
            });
            await page.waitForTimeout(1000);

            displayLog('step', 'should ride vehicle: ', 'move to zero position');
            await page.evaluate(async () => {
                window.globalWebaverse.playersManager.localPlayer.characterPhysics.setPosition(
                {x: 0, y: 1.5, z: 0},
                );
            });
            await page.waitForTimeout(2000);

            displayLog('step', 'should ride vehicle: ', 'validation');
            displayLog(isVehicleRided? 'success' : 'error', 'should ride vehicle: ', 'isVehicleRided');
            displayLog(vehicleMove.currentPosition !== firstPosition? 'success' : 'error', 'should ride vehicle: ', 'moved');
            displayLog(isVehicleUnRided? 'success' : 'error', 'should ride vehicle: ', 'isVehicleUnRided');

            const isSuccess = isVehicleRided && vehicleMove.currentPosition !== firstPosition && isVehicleUnRided
            displayLog(isSuccess ? 'passed' : 'fail', 'should ride vehicle: ', 'hovercraft');

            expect(isVehicleRided).toBeTruthy();
            expect(vehicleMove.currentPosition !== firstPosition).toBeTruthy();
            expect(isVehicleUnRided).toBeTruthy();
            // expect(isSuccess).toBeTruthy();
        },
    totalTimeout,
    );
});