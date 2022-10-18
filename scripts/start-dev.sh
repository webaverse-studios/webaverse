export NODE_ENV=development
export OLDNAME=$UID
sudo --preserve-env=NODE_ENV --preserve-env=HOME --preserve-env=OLDNAME $(which node) index.mjs