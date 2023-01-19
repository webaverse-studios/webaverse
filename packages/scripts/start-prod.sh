export NODE_ENV=production
# export OLDNAME=$UID
# export CMDEXE=$(which cmd.exe)
sudo setcap 'cap_net_bind_service=+ep' `which node`
node index.mjs