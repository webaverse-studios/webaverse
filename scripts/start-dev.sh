export NODE_ENV=development
# export OLDNAME=$UID
# export CMDEXE=$(which cmd.exe)
# export OLDPATH=$PATH
sudo setcap 'cap_net_bind_service=+ep' `which node`
node index.mjs