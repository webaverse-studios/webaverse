#!/bin/bash
# use sed to replace the line starting with "command2 = isWsl" in the file
# this is needed to fix looking for the wrong powershell.exe on non-C:\ drives
sed -i 's/command2 = isWsl.*/command2 = "powershell.exe"/' ./node_modules/wrangler/wrangler-dist/cli.js

RESOLVED_PORT=$PORT
if [ -z "$PORT" ]; then
  RESOLVED_PORT=2222
fi
echo "http://localhost:$RESOLVED_PORT/"

# start local development server
node ./node_modules/wrangler dev -l --port $RESOLVED_PORT
