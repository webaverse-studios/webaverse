echo 'Installing Compiler...'
pushd packages/compiler; npm i; popd;
echo 'Installing Multiplayer...'
pushd packages/multiplayer-do; npm i; popd;
echo 'Installing Previewer...'
pushd packages/previewer; npm i; popd;