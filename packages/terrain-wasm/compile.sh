mkdir -p bin
echo 'building main...'
# m = 64*1024; s = 200 * 1024 * 1024; Math.floor(s/m)*m;
emcc -s NO_EXIT_RUNTIME=1 -s TOTAL_MEMORY=209715200 -D__linux__ -s ALLOW_MEMORY_GROWTH=0 -O3 \
  main.cc \
  terrain.cc \
  SimplexNoise.cc \
  -I. \
  -o bin/terrain.js
sed -Ei 's/terrain.wasm/bin\/terrain.wasm/g' bin/terrain.js
sed -Ei 's/scriptDirectory\+path/"\/"+path/g' bin/terrain.js
echo 'let accept, reject;const p = new Promise((a, r) => {  accept = a;  reject = r;});Module.postRun = () => {  accept();};Module.waitForLoad = () => p;run();export default Module;' >> bin/terrain.js
echo 'done building main'

