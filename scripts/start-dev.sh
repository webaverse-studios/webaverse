export NODE_ENV=development
sudo setcap 'cap_net_bind_service=+ep' `which node`
node index.mjs