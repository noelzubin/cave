#! env fish

set -x DATABASE_URL file://home/noelzubin/Dropbox/cave/db.sqlite
nodemon -e ts -i dist --exec "node dist/src/index.js server"