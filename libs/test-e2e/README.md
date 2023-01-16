
# E2E Automatic Test Using Jest and Puppeteer

## Overview

We are going to constructure the automated testing using [Jest](https://jestjs.io/) and [Puppeteer](https://pptr.dev/api/).

End-to-end testing (e2e for short) is **a process in which the entire lifecycle of an application is tested from a user’s perspective in a production-like scenario**. This process typically involves deploying a script to automatically navigate through the application’s interface as a normal user would, testing for specific features and behaviors along the way.

Puppeteer framework is **a tool that allows developers to automate the testing of websites in Google Chrome**. It allows testers to use JavaScript commands to interact with the browser.

Jest is a JavaScript testing framework designed **to ensure correctness of any JavaScript codebase**. It allows you to write tests with an approachable, familiar and feature-rich API that gives you results quickly.

Basically the highest value we get is from anything that requires manual testing right now but could be automated.

For example, we could design the tests in the such a way that you hold W down for 1 seconds, run right into the weapon, press E, and click right button to fire.

In the above test, we could check the character movement direction, speed, animation status, object attchment, weapon status, bullet direction and speed and etc.

We think 90% of bugs would be caught by **looping over the scene files and activating all objects**.


## Get Started

Use the following instructions if you’re starting automatic e2e test first time:

1.  Make sure `Jest and Puppeteer` npms are installed correctly.
2.  Create a new file in the `/tests/e2e` folder.
3.  Rename the file in this rule: `[category]-[function]-test.js`. ex:  `character-movement-test.js`
    
    ---

## How to write the simple test code

```
jest.setTimeout(60000)
describe('Basic google visit e2e tests', () => {
  	beforeAll( async () => {
		await page.goto('https://www.google.com');
		await page.waitFor(5000);
	});

	it( 'Should be truthy', async () => {
		expect( true ).toBeTruthy();
	})	
});
```

In this code, you first set Jest’s default timeout to 60 seconds with the `setTimeout()` method. Jest has a default timeout of five seconds at which a test must pass or fail, or the test will return an error. Since browser interactions often take longer than five seconds to run, you set it to 60 seconds to accommodate the timelapse.

Next, the `describe` block groups related tests with each other using the `describe` keyword. Within that, the `beforeAll` script allows you to run specific code before every test in this block. This holds code like variables that are local to this test block but global to all tests it contains. Then you use the `page` object to navigate to `www.google.com` and wait for five seconds, so that you can see the page after it loads and before the browser closes. The `page` object is globally available in all test suites.

Next, you created a mock test to validate that the script you have written works. It checks if the boolean `true` is a truthy value, which will always be the case if all is working correctly.


## Writting Test Code In the Project

```
const {launchBrowser, enterScene, closeBrowser, getCurrentPage, totalTimeout} = require('../utils/utils');

describe('should character movement', () => {
	beforeAll(async () => {
		await launchBrowser();
		//Todo: define custom functions here
		// await page.evaluate(async () => {
		// 	window.todo = () => {} 
		// })
		await enterScene(`https://local.webaverse.com:3000/`)
	}, totalTimeout)

	afterAll(async () => {
		await closeBrowser()
	}, totalTimeout)

	test('should character movement: crouch', async () => {
		const page = getCurrentPage()
		const lastPosition =  await page.evaluate(async () => {
			return globalWebaverse.playersManager.localPlayer.avatar.lastPosition
		})
		await page.keyboard.down("ControlLeft")
		await page.keyboard.down("KeyC")
		await page.waitForTimeout(100)
		await page.keyboard.up("ControlLeft")
		await page.keyboard.up("KeyC")
		await page.waitForTimeout(100)
		await page.keyboard.down("KeyW")
		await page.waitForTimeout(1000)
		const isCrouch =  await page.evaluate(async (lastPosition) => {
			const avatar = globalWebaverse.playersManager.localPlayer.avatar
			const currentSpeed = avatar.velocity.length()
			const crouchFactor = avatar.crouchFactor
			const currentPosition = avatar.lastPosition
			return currentSpeed > 0 && crouchFactor !== 0 && currentPosition != lastPosition
		}, lastPosition)
		await page.keyboard.up("KeyW")
		await page.keyboard.down("ControlLeft")
		await page.keyboard.down("KeyC")
		await page.waitForTimeout(100)
		await page.keyboard.up("ControlLeft")
		await page.keyboard.up("KeyC")
		expect(isCrouch).toBeTruthy();
	}, totalTimeout)
})
```

These functions are defined in `/utils/utils.js`

1.  `launchBrowser`: launch the browser and able to set `headless` option.

		```
			browser = await puppeteer.launch( {
				headless: !isdebug,
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
					'--mute-audio'
				],
				devtools: true
			})
		```
	By default, Puppeteer executes the test in `headless` Chromium. This means if we are running a test using Puppeteer, then we won't be able to view the execution in the browser.
	To enable execution in the headed mode, we have to add the parameter: headless:false in the code.

2.  `enterScene` : navigate to the scene and wait until the avatar object loaded fully
3.  `getCurrentPage`: get current page to interact with
	```
	const page = getCurrentPage()
	await page.keyboard.press("KeyF")
	await page.waitForTimeout(1000)
	``` 
	Page provides methods to interact with a single tab or extension background page in Chromium.

4.  `globalWebaverse`: global variable to interact with the project runtime. it's defined in `webaverse.js`
	```
	window.globalWebaverse = {
		metaversefileApi,
		playersManager,
		physicsManager,
		universe,
		webaverse
	}
	```

## How To Test
1) In the `/app` folder you can start the test using this command.
	```
	npm run test-e2e
	```
2) To debug the one each test file, you can launch the server and test engine separately.
	```
	npm run dev
	```
	In the test folder, you can start using jest
	```
	cd test/
	jest character-movement-test.js
	```
	You can check out this for more [options](https://jestjs.io/docs/cli).
---
