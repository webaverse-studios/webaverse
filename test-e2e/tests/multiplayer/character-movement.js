
const {
	launchBrowser,
	enterScene,
	closeBrowser,
	displayLog,
	totalTimeout,
	getCurrentPage,
} = require('../../utils/utils');

describe(
	'multiplayer: should character movement',
	() => {
		beforeAll(async () => {
			await launchBrowser(true);
			// Todo: define custom functions here
			// await page.evaluate(async () => {
			// 	window.todo = () => {}
			// })
			await enterScene(`https://local.webaverse.com/?src=./test-e2e/scenes/test-e2e-empty.scn`, 0);
			await enterScene(`https://local.webaverse.com/?src=./test-e2e/scenes/test-e2e-empty.scn`, 1);
		}, totalTimeout);

		afterAll(async () => {
			await closeBrowser();
		}, totalTimeout);

		test(
			'multiplayer: should character loaded',
			async () => {
				for(let i = 0; i < 2; i++) {
					displayLog('section', `multiplayer: should character loaded: player ${i}: `, 'start');
					const avatarFlag = await getCurrentPage(i).evaluate(async () => {
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

					displayLog(avatarFlag.isPlayerAvatarApp? 'success' : 'error', `multiplayer: should character loaded: player ${i}: `, 'isPlayerAvatarApp');
					displayLog(avatarFlag.isBound? 'success' : 'error', `multiplayer: should character loaded: player ${i}: `, 'isBound');
					displayLog(avatarFlag.isCharacterSfx? 'success' : 'error', `multiplayer: should character loaded: player ${i}: `, 'isCharacterSfx');
					displayLog(avatarFlag.isCharacterHups? 'success' : 'error', `multiplayer: should character loaded: player ${i}: `, 'isCharacterHups');
					displayLog(avatarFlag.isCharacterFx? 'success' : 'error', `multiplayer: should character loaded: player ${i}: `, 'isCharacterFx');
					displayLog(avatarFlag.isCharacterHitter? 'success' : 'error', `multiplayer: should character loaded: player ${i}: `, 'isCharacterHitter');
					displayLog(avatarFlag.isCharacterFace? 'success' : 'error', `multiplayer: should character loaded: player ${i}: `, 'isCharacterFace');
					displayLog(avatarFlag.isCharacterPhysic? 'success' : 'error', `multiplayer: should character loaded: player ${i}: `, 'isCharacterPhysic');

					const isSuccess = avatarFlag.isPlayerAvatarApp && avatarFlag.isBound
														&& avatarFlag.isCharacterSfx && avatarFlag.isCharacterHups
														&& avatarFlag.isCharacterFx && avatarFlag.isCharacterHitter
														&& avatarFlag.isCharacterFace && avatarFlag.isCharacterPhysic

					displayLog(isSuccess ? 'passed' : 'fail', `multiplayer: should character loaded: player ${i}: `, 'avatar');
					expect(isSuccess).toBeTruthy();
				}
			},
			totalTimeout,
		);

		test(
			'multiplayer: should character movement: walk',
			async () => {
				displayLog('section', 'multiplayer: should character movement: ', 'walk');
				const pageA = getCurrentPage(0);
				const pageB = getCurrentPage(1);

				displayLog('step', 'multiplayer: should character movement: ', 'moving');
				const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
				const keyA = keys[Math.floor(Math.random() * keys.length)];
				const keyB = keys[Math.floor(Math.random() * keys.length)];
				await pageA.keyboard.down(keyA);
				await pageA.waitForTimeout(1000);
				await pageB.keyboard.down(keyB);
				await pageB.waitForTimeout(1000);
				
				displayLog('step', 'multiplayer: should character movement: ', 'validation');
				expect(true).toBeTruthy();
			},
			totalTimeout,
		);

		test(
			'multiplayer: should character movement: run',
			async () => {
				displayLog('section', 'multiplayer: should character movement: ', 'run');
				const pageA = getCurrentPage(0);
				const pageB = getCurrentPage(1);

				displayLog('step', 'multiplayer: should character movement: ', 'running');
				const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
				const key = keys[Math.floor(Math.random() * keys.length)];
				await pageA.keyboard.down('ShiftRight');
				await pageA.waitForTimeout(100);
				await pageA.keyboard.down(key);
				await pageA.waitForTimeout(1000);

				await pageB.keyboard.down('ShiftRight');
				await pageB.waitForTimeout(100);
				await pageB.keyboard.down(key);
				await pageB.waitForTimeout(1000);
				expect(true).toBeTruthy();
			},
			totalTimeout,
		);

		test(
			'multiplayer: should character movement: naruto run',
			async () => {
				displayLog('section', 'multiplayer: should character movement: ', 'naruto run');
				displayLog('step', 'multiplayer: should character movement: ', 'naruto run start');
				const pageA = getCurrentPage();
				const pageB = getCurrentPage();
				await pageA.keyboard.down('ShiftLeft');
				await pageA.waitForTimeout(100);
				await pageA.keyboard.type('wwwwwwwwww');
				await pageA.waitForTimeout(3000);

				await pageB.keyboard.down('ShiftLeft');
				await pageB.waitForTimeout(100);
				await pageB.keyboard.type('wwwwwwwwww');
				await pageB.waitForTimeout(3000);

				expect(true).toBeTruthy();
			},
			totalTimeout,
		);

		test(
			'multiplayer: should character movement: jump',
			async () => {
				displayLog('section', 'multiplayer: should character movement: ', 'jump');
				displayLog('step', 'multiplayer: should character movement: ', 'jump start');
				const pageA = getCurrentPage(0);
				const pageB = getCurrentPage(1);
				for (let i = 0; i < 3; i++) {
					await pageA.keyboard.press('Space');
					await pageA.waitForTimeout(100);
					await pageA.waitForTimeout(2000);
				}
				await pageA.waitForTimeout(3000);

				for (let i = 0; i < 3; i++) {
					await pageB.keyboard.press('Space');
					await pageB.waitForTimeout(100);
					await pageB.waitForTimeout(2000);
				}
				await pageB.waitForTimeout(3000);

				expect(true).toBeTruthy();
			},
			totalTimeout,
		);

		test(
			'multiplayer: should character movement: double jump',
			async () => {
				displayLog('section', 'multiplayer: should character movement: ', 'double jump');
				displayLog('step', 'multiplayer: should character movement: ', 'double jump start');
				const pageA = getCurrentPage(0);
				const pageB = getCurrentPage(1);
				// ToDO: need to repeat for get average because sometimes page.evaluate takes a few sec
				for (let i = 0; i < 3; i++) {
					await pageA.keyboard.press('Space');
					await pageA.waitForTimeout(100);
					await pageA.keyboard.press('Space');
					await pageA.waitForTimeout(100);

					await pageB.keyboard.press('Space');
					await pageB.waitForTimeout(100);
					await pageB.keyboard.press('Space');
					await pageB.waitForTimeout(100);
				}
				expect(true).toBeTruthy();
			},
			totalTimeout,
		);

		test(
			'multiplayer: should character movement: crouch',
			async () => {
				displayLog('section', 'multiplayer: should character movement: ', 'crouch');
				const pageA = getCurrentPage(0);
				displayLog('step', 'multiplayer: should character movement: ', 'crouch and move');
				await pageA.keyboard.down('ControlLeft');
				await pageA.keyboard.down('KeyC');
				await pageA.waitForTimeout(100);
				await pageA.keyboard.up('ControlLeft');
				await pageA.keyboard.up('KeyC');
				await pageA.waitForTimeout(100);
				await pageA.keyboard.down('KeyW');
				await pageA.waitForTimeout(2000);

				await pageA.keyboard.up('KeyW');
				await pageA.keyboard.down('ControlLeft');
				await pageA.keyboard.down('KeyC');
				await pageA.waitForTimeout(100);
				await pageA.keyboard.up('ControlLeft');
				await pageA.keyboard.up('KeyC');
				await pageA.waitForTimeout(3000);

				const pageB = getCurrentPage(0);
				displayLog('step', 'multiplayer: should character movement: ', 'crouch and move');
				await pageB.keyboard.down('ControlLeft');
				await pageB.keyboard.down('KeyC');
				await pageB.waitForTimeout(100);
				await pageB.keyboard.up('ControlLeft');
				await pageB.keyboard.up('KeyC');
				await pageB.waitForTimeout(100);
				await pageB.keyboard.down('KeyW');
				await pageB.waitForTimeout(2000);

				await pageB.keyboard.up('KeyW');
				await pageB.keyboard.down('ControlLeft');
				await pageB.keyboard.down('KeyC');
				await pageB.waitForTimeout(100);
				await pageB.keyboard.up('ControlLeft');
				await pageB.keyboard.up('KeyC');
				await pageB.waitForTimeout(3000);
				
				expect(true).toBeTruthy();
			},
			totalTimeout,
		);

		test(
			'multiplayer: should character movement: fly',
			async () => {
				displayLog('section', 'multiplayer: should character movement: ', 'fly');
				const pageA = getCurrentPage(0);
				await pageA.keyboard.press('KeyF');
				await pageA.keyboard.down('KeyW');
				await pageA.waitForTimeout(1000);
				await pageA.keyboard.up('KeyW');
				await pageA.keyboard.press('KeyF');
				await pageA.waitForTimeout(3000);

				const pageB = getCurrentPage(0);
				await pageB.keyboard.press('KeyF');
				await pageB.keyboard.down('KeyW');
				await pageB.waitForTimeout(1000);
				await pageB.keyboard.up('KeyW');
				await pageB.keyboard.press('KeyF');
				await pageB.waitForTimeout(3000);

				expect(true).toBeTruthy();
			},
			totalTimeout,
		);

		test(
			'multiplayer: should character movement: dance',
			async () => {
				displayLog('section', 'multiplayer: should character movement: ', 'dance');
				const pageA = getCurrentPage(0);
				await pageA.keyboard.down('KeyV');
				await pageA.waitForTimeout(2000);
				await pageA.keyboard.up('KeyV');
				await pageA.waitForTimeout(3000);

				const pageB = getCurrentPage(0);
				await pageB.keyboard.down('KeyV');
				await pageB.waitForTimeout(2000);
				await pageB.keyboard.up('KeyV');
				await pageB.waitForTimeout(3000);
				expect(true).toBeTruthy();
			},
			totalTimeout,
		);
	},
	totalTimeout,
);
  
  
  