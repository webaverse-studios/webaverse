# PhysX WASM for Webaverse client

## Introduction ##
Webaverse uses a WebAssembly Build of PhysX, a C++ open-source realtime physics engine middleware SDK developed by Nvidia.
It is compiled with EMSDK.

## Setup Requirements

### Get [Webaverse PhysX Build](https://github.com/webaverse/app-wasm) (APP-WASM)
- Fork and clone it to your prefered directory.


### Get [Emscripten SDK](https://github.com/emscripten-core/emsdk)
- Clone it and then run these commands inside the **emsdk** directory:
    `./emsdk install latest`
    `./emsdk activate latest`
    

## Compilation

- Within **app-wasm** point to the **emsdk** directory using this command:
`source /home/user/emsdk/emsdk_env.sh` change it to your own path.

- Now inside **app-wasm** run this to compile:
`./compile.sh`

- Congrats! If it compiled without errors the finished build should be in `app-wasm/bin`

## Use it in Webaverse

- Copy the `geometry.js` and `geometry.wasm` files from `app-wasm/bin`
- Paste them into `app/public/bin` in the Webaverse app
- Done! Now reload the Webaverse app and try out your own PhysX configuration!

---

## PhysX Docs

- https://gameworksdocs.nvidia.com/PhysX/4.1/documentation/physxguide/Index.html
- https://docs.nvidia.com/gameworks/content/gameworkslibrary/physx/guide/Manual/Index.html

