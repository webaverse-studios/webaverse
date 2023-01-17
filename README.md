<img src="libs/docs/banner.jpeg" width=100% />

<p align="center">
    <a href="https://github.com/webaverse-studios/webaverse/graphs/contributors" alt="Contributors">
        <img src="https://img.shields.io/github/contributors/webaverse-studios/webaverse" /></a>
    <a href="https://discord.gg/webaverse">
        <img src="https://img.shields.io/discord/906925486049992755.svg?logo=discord"
            alt="chat on Discord"></a>
    <a href="https://twitter.com/intent/follow?screen_name=webaverse">
        <img src="https://img.shields.io/twitter/follow/webaverse?style=social&logo=twitter"
            alt="follow on Twitter"></a>
</p>
<h1 align="center">Webaverse</h1>
<p align="center">
An open source web3 metaverse game engine that anyone can host. Easy to use, runs in the browser and utilizes open tools and standards like <a href="https://github.com/mrdoob/three.js">three.js</a> and <a href="https://github.com/nodejs/node">Node</a>.
</p>
<p align="center">
Everything you need to get started with building in the Webaverse is contained in this repository.
</p>

## Key Features

- 🎮 A full-featured game engine running in your browser
- ♾️ Infinite procedurally generated world
- 🧑‍🤝‍🧑 Multiplayer with voice and chat
- 🤖 AI-powered non-player characters
- 👓 Supports desktop and VR (mobile coming soon)
- 😊 Expressive, vocal and emotive avatars
- 🔮 Runtime support for user uploads and custom apps
- 🖥️ Completely self-hostable

<p align="center">
<img src="libs/docs/combat.gif" width=30% padding="0" margin="0" align="center" />
<img src="libs/docs/asteroids.gif" width=30% align="center" />
<img src="libs/docs/rug_radio.gif" width=30% align="center" />
</p>
<p align="center">
<img src="libs/docs/rotation.gif" width=91% align="center" />
</p>
<p align="center">
<img src="libs/docs/Uncanny_alley.gif" width=30% align="center" />
<img src="libs/docs/monster_truck.gif" width=30% align="center" />
<img src="libs/docs/plane.gif" width=30% align="center" />
</p>

<h1 align="center">Documentation</h1>
<p align="center">
Developer documentation is <a href="https://docs.webaverse.com/docs/index">here</a><br />
User documentation is <a href="https://webaverse.notion.site/User-Docs-3a36b223e39b4f94b3d1f6921a4c297a">here</a>
</p>

## Minimum Requirements

- 10 GB Disk Space
- 8 GB RAM
- 4 Core CPU / vCPUs
- Node version 18+. The recommended way to get node is `nvm`: https://github.com/nvm-sh/nvm

## Installation

**Important note before you clone this repo:** This repo uses Git submodules.
You need to install with the `--recurse-submodules` flag or installation will not work. Copy the code below to clone the repository if you aren't sure.

```sh
git clone https://github.com/webaverse-studios/webaverse.git && cd webaverse
npm install # Install dependencies
```

## Running

Starting the application is as easy as:

```sh
npm run dev
```

Once the server has started up, you can press the "A" key to visit `https://localhost:4200`.

## Installation and Running on Windows

#### WSL

You may need to use Windows Subsystem for Linux to install and run Webaverse. [This video](https://www.youtube.com/watch?v=5RTSlby-l9w) shows you how you can set up WSL and Ubuntu.

Requirements:

- WSL2. If you have WSL1 installed you need to upgrade to WSL2.
- Ubuntu 20+. Install Ubuntu 20+.

Once you have WSL and Ubuntu set up, run `wsl` in a Windows command window to get a WSL Ubuntu command prompt. Run `exit` at the WSL command prompt to return to the Windows command prompt.

#### Node

At a WSL command prompt, use `nvm` to install Node 18+.

#### Dependencies

Run the following command at the WSL command prompt to install dependencies:

```sh
npm run install-libs
```

<details>
<summary>The following libraries get installed with this command (you can also install manually):</summary>

- libatk1.0-0
- libatk-bridge2.0-0
- libxcomposite-dev
- libxdamage1
- libxrandr2
- libgbm-dev
- libxkbcommon-x11-0
- libpangocairo-1.0-0
- libasound2
- libwayland-client0

</details>

#### Port Mapping

To route all of the needed ports for 127.0.0.1 -> WSL to work locally, run the following command in a Powershell window:

```
powershell.exe .\scripts\wsl-port-forwarding.ps1
```

#### Installation

You can host the source files on either your Windows file system or on the Ubuntu file system in WSL's virtual drive.

**Windows File System:** Run the Git commands to clone and pull source files from a Windows command prompt. You may find this best if you're using programs such as SourceTree as a Git GUI. You can also edit source using your usual IDE.

**Ubuntu File System:** Run the Git commands to clone and pull source files from a WSL command prompt. In this case consider [using the Visual Studio Code WSL extension](https://code.visualstudio.com/docs/remote/wsl) as your dev environment - for features such as hot reload.

#### Running

Start the application by running the NPM command at a WSL command prompt.

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/empec-webastudios"><img src="https://avatars.githubusercontent.com/u/113935397?v=4?s=100" width="100px;" alt="empec-webastudios"/><br /><sub><b>empec-webastudios</b></sub></a><br /><a href="#infra-empec-webastudios" title="Infrastructure (Hosting, Build-Tools, etc)">🚇</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://webaverse.com/"><img src="https://avatars.githubusercontent.com/u/6926057?v=4?s=100" width="100px;" alt="Avaer Kazmer"/><br /><sub><b>Avaer Kazmer</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=avaer" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://gonnavis.com"><img src="https://avatars.githubusercontent.com/u/10785634?v=4?s=100" width="100px;" alt="Vis"/><br /><sub><b>Vis</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=gonnavis" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/codingbycl"><img src="https://avatars.githubusercontent.com/u/29695350?v=4?s=100" width="100px;" alt="codingbycl"/><br /><sub><b>codingbycl</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=codingbycl" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://xrdevlog.com/"><img src="https://avatars.githubusercontent.com/u/32600939?v=4?s=100" width="100px;" alt="jin"/><br /><sub><b>jin</b></sub></a><br /><a href="#content-madjin" title="Content">🖋</a> <a href="https://github.com/webaverse-studios/webaverse/commits?author=madjin" title="Code">💻</a> <a href="https://github.com/webaverse-studios/webaverse/commits?author=madjin" title="Documentation">📖</a> <a href="#ideas-madjin" title="Ideas, Planning, & Feedback">🤔</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://thenexus.city"><img src="https://avatars.githubusercontent.com/u/18633264?v=4?s=100" width="100px;" alt="M̵̞̗̝̼̅̏̎͝Ȯ̴̝̻̊̃̋̀Õ̷̼͋N̸̩̿͜ ̶̜̠̹̼̩͒"/><br /><sub><b>M̵̞̗̝̼̅̏̎͝Ȯ̴̝̻̊̃̋̀Õ̷̼͋N̸̩̿͜ ̶̜̠̹̼̩͒</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=lalalune" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.sjain.dev"><img src="https://avatars.githubusercontent.com/u/8850830?v=4?s=100" width="100px;" alt="Shubham Jain"/><br /><sub><b>Shubham Jain</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=shu8" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://demo.iconix.io"><img src="https://avatars.githubusercontent.com/u/1478866?v=4?s=100" width="100px;" alt="TheoTheDev"/><br /><sub><b>TheoTheDev</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=TheoTheDev" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/tcm390"><img src="https://avatars.githubusercontent.com/u/60634884?v=4?s=100" width="100px;" alt="tcm390"/><br /><sub><b>tcm390</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=tcm390" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/GuiltyRegicide"><img src="https://avatars.githubusercontent.com/u/58578426?v=4?s=100" width="100px;" alt="GuiltyRegicide"/><br /><sub><b>GuiltyRegicide</b></sub></a><br /><a href="#design-GuiltyRegicide" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/abeersaqib"><img src="https://avatars.githubusercontent.com/u/5277220?v=4?s=100" width="100px;" alt="Muhammad Abeer"/><br /><sub><b>Muhammad Abeer</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=abeersaqib" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/arya-prod"><img src="https://avatars.githubusercontent.com/u/64514807?v=4?s=100" width="100px;" alt="arya"/><br /><sub><b>arya</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=arya-prod" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Loryhoof"><img src="https://avatars.githubusercontent.com/u/29487929?v=4?s=100" width="100px;" alt="Loryhoof"/><br /><sub><b>Loryhoof</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=Loryhoof" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/plankatron"><img src="https://avatars.githubusercontent.com/u/5592454?v=4?s=100" width="100px;" alt="plankatron"/><br /><sub><b>plankatron</b></sub></a><br /><a href="#design-plankatron" title="Design">🎨</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/torchesburn"><img src="https://avatars.githubusercontent.com/u/51108458?v=4?s=100" width="100px;" alt="torchesburn"/><br /><sub><b>torchesburn</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=torchesburn" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://a.goblin.life"><img src="https://avatars.githubusercontent.com/u/462380?v=4?s=100" width="100px;" alt="a Goblin King"/><br /><sub><b>a Goblin King</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=AGoblinKing" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/jakezira"><img src="https://avatars.githubusercontent.com/u/14852075?v=4?s=100" width="100px;" alt="Jack Z."/><br /><sub><b>Jack Z.</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=jakezira" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/alisaad673"><img src="https://avatars.githubusercontent.com/u/35926530?v=4?s=100" width="100px;" alt="Ali Saad"/><br /><sub><b>Ali Saad</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=alisaad673" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/0reo"><img src="https://avatars.githubusercontent.com/u/7738818?v=4?s=100" width="100px;" alt="Adam Clarke"/><br /><sub><b>Adam Clarke</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=0reo" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/Arthur-Acha"><img src="https://avatars.githubusercontent.com/u/96268540?v=4?s=100" width="100px;" alt="2AM"/><br /><sub><b>2AM</b></sub></a><br /><a href="#audio-Arthur-Acha" title="Audio">🔊</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://cybermancers.ca"><img src="https://avatars.githubusercontent.com/u/889851?v=4?s=100" width="100px;" alt="Matthew Willox"/><br /><sub><b>Matthew Willox</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=mwmwmw" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/memelotsqui"><img src="https://avatars.githubusercontent.com/u/1117257?v=4?s=100" width="100px;" alt="memelotsqui"/><br /><sub><b>memelotsqui</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=memelotsqui" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ChristopherTrimboli"><img src="https://avatars.githubusercontent.com/u/27584221?v=4?s=100" width="100px;" alt="cjft"/><br /><sub><b>cjft</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=ChristopherTrimboli" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ultrabot2022"><img src="https://avatars.githubusercontent.com/u/80860637?v=4?s=100" width="100px;" alt="UltraBot"/><br /><sub><b>UltraBot</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=ultrabot2022" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/intelliverse777"><img src="https://avatars.githubusercontent.com/u/103969701?v=4?s=100" width="100px;" alt="intelliverse777"/><br /><sub><b>intelliverse777</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=intelliverse777" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/rondoor124"><img src="https://avatars.githubusercontent.com/u/92342281?v=4?s=100" width="100px;" alt="Ron"/><br /><sub><b>Ron</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=rondoor124" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/mavisakalyan"><img src="https://avatars.githubusercontent.com/u/55106546?v=4?s=100" width="100px;" alt="ꈤꍟꎭꍟꌗꀤꌗ"/><br /><sub><b>ꈤꍟꎭꍟꌗꀤꌗ</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=mavisakalyan" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/patriboz"><img src="https://avatars.githubusercontent.com/u/49231818?v=4?s=100" width="100px;" alt="Patrick Bozic"/><br /><sub><b>Patrick Bozic</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=patriboz" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/GaladWarder"><img src="https://avatars.githubusercontent.com/u/29031531?v=4?s=100" width="100px;" alt="Grant Roberts"/><br /><sub><b>Grant Roberts</b></sub></a><br /><a href="#design-GaladWarder" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/alextitonis"><img src="https://avatars.githubusercontent.com/u/45359358?v=4?s=100" width="100px;" alt="alextitonis"/><br /><sub><b>alextitonis</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=alextitonis" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/ahadshams"><img src="https://avatars.githubusercontent.com/u/44798013?v=4?s=100" width="100px;" alt="ahadshams"/><br /><sub><b>ahadshams</b></sub></a><br /><a href="#business-ahadshams" title="Business development">💼</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://emotionull.art/"><img src="https://avatars.githubusercontent.com/u/91581825?v=4?s=100" width="100px;" alt="Emotionull"/><br /><sub><b>Emotionull</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=helloama" title="Documentation">📖</a> <a href="#ideas-helloama" title="Ideas, Planning, & Feedback">🤔</a> <a href="#content-helloama" title="Content">🖋</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/aerydna"><img src="https://avatars.githubusercontent.com/u/7593650?v=4?s=100" width="100px;" alt="Andrea Ruzzenenti"/><br /><sub><b>Andrea Ruzzenenti</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=aerydna" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/soulofmischief"><img src="https://avatars.githubusercontent.com/u/30357883?v=4?s=100" width="100px;" alt="soulofmischief"/><br /><sub><b>soulofmischief</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=soulofmischief" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/belopot"><img src="https://avatars.githubusercontent.com/u/46432435?v=4?s=100" width="100px;" alt="belopot"/><br /><sub><b>belopot</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=belopot" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://ctrlaltstudio.com"><img src="https://avatars.githubusercontent.com/u/7455448?v=4?s=100" width="100px;" alt="David Rowe"/><br /><sub><b>David Rowe</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=ctrlaltdavid" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/blockchainFull2022"><img src="https://avatars.githubusercontent.com/u/117472008?v=4?s=100" width="100px;" alt="potoelite"/><br /><sub><b>potoelite</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=blockchainFull2022" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://twitter.com/NotFuji_"><img src="https://avatars.githubusercontent.com/u/38316883?v=4?s=100" width="100px;" alt="NotFuji"/><br /><sub><b>NotFuji</b></sub></a><br /><a href="#design-NotFuji" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/zenkale"><img src="https://avatars.githubusercontent.com/u/111510128?v=4?s=100" width="100px;" alt="zenkale"/><br /><sub><b>zenkale</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=zenkale" title="Tests">⚠️</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/semilistnik"><img src="https://avatars.githubusercontent.com/u/6167566?v=4?s=100" width="100px;" alt="Dmytro Fomenko"/><br /><sub><b>Dmytro Fomenko</b></sub></a><br /><a href="#design-semilistnik" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kiibarina"><img src="https://avatars.githubusercontent.com/u/108288701?v=4?s=100" width="100px;" alt="kiibarina"/><br /><sub><b>kiibarina</b></sub></a><br /><a href="#design-kiibarina" title="Design">🎨</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/JFKraasch"><img src="https://avatars.githubusercontent.com/u/76698239?v=4?s=100" width="100px;" alt="Jonas Kraasch"/><br /><sub><b>Jonas Kraasch</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=JFKraasch" title="Code">💻</a></td>
    </tr>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/listofbanned"><img src="https://avatars.githubusercontent.com/u/50330310?v=4?s=100" width="100px;" alt="Jimmy"/><br /><sub><b>Jimmy</b></sub></a><br /><a href="https://github.com/webaverse-studios/webaverse/commits?author=listofbanned" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="https://github.com/kishdr"><img src="https://avatars.githubusercontent.com/u/17167456?v=4?s=100" width="100px;" alt="kishdr"/><br /><sub><b>kishdr</b></sub></a><br /><a href="#design-kishdr" title="Design">🎨</a></td>
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

## Let's build it together!

We would love for you to come build with us. First, please review the documentation in it's entirety before contributing. Also join our [Discord](https://discord.gg/webaverse) and introduce yourself.

##### New Issues and Features

Please search Github issues before reporting a new issue or starting a new feature. If you are starting a new feature or bug fix, please write up or reference an issue and indicate that you are working on it.

##### Pull Requests

Please make sure your PRs change as little existing code as is necessary to prevent upstream merge conflicts. When posting a pull request, please document what the PR does and how it can be reviewed and QA'd. PRs will be reviewed and accepted if they conform to our linting and code conventions, don't cause any bugs and don't decrease performance of the app.

<img align="middle" style='margin: 1em' src="libs/docs/town.jpeg" width=100% />
