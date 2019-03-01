lsof -n -i4TCP:3000 | grep LISTEN | awk '{ print $2 }' | xargs kill
lsof -n -i4TCP:4000 | grep LISTEN | awk '{ print $2 }' | xargs kill
lsof -n -i4TCP:4001 | grep LISTEN | awk '{ print $2 }' | xargs kill