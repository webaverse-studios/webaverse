<img src="libs/docs/banner.jpeg" width=100% />
<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->
[![All Contributors](https://img.shields.io/badge/all_contributors-13-orange.svg?style=flat-square)](#contributors-)
<!-- ALL-CONTRIBUTORS-BADGE:END -->

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
git clone https://github.com/webaverse-studios/webaverse.git
cd webaverse/ # Go into the repository
git pull --recurse-submodules # Pull recursively
npm install # Install dependencies
```

## Running

Starting the application is as easy as:

```sh
npm run dev
```

Once the server has started up, you can press the "A" key to visit `https://local.webaverse.com`.


## Installation and Running on Windows

#### WSL

You need to use Windows Subsystem for Linux to install and run Webaverse. [This video](https://www.youtube.com/watch?v=5RTSlby-l9w) shows you how you can set up WSL and Ubuntu.

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


## Let's build it together!

We would love for you to come build with us. First, please review the documentation in it's entirety before contributing. Also join our [Discord](https://discord.gg/webaverse) and introduce yourself.

##### New Issues and Features

Please search Github issues before reporting a new issue or starting a new feature. If you are starting a new feature or bug fix, please write up or reference an issue and indicate that you are working on it.

##### Pull Requests

Please make sure your PRs change as little existing code as is necessary to prevent upstream merge conflicts. When posting a pull request, please document what the PR does and how it can be reviewed and QA'd. PRs will be reviewed and accepted if they conform to our linting and code conventions, don't cause any bugs and don't decrease performance of the app.

<img align="middle" style='margin: 1em' src="libs/docs/town.jpeg" width=100% />

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
    </tr>
  </tbody>
</table>

<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!