#!/bin/sh
# Render a fixed set of comparison views: tools/views.sh <prefix>
P=${1:-v}
for spec in "x=50.5&z=47&h=11:town" "x=24&z=34&h=9:forest" "x=74&z=31&h=10:meadow" "x=50&z=45&h=15&fly=1:fly" "x=50.5&z=47.5&h=22.5:night" "x=51&z=62.5&h=17.8:harbor" "x=19.5&z=26.5&h=10:spirit" "x=24&z=33&h=21.5:forestnight" "x=50.5&z=29&h=10:hotel" "x=50&z=34&h=16&fly=1:hotelfly"; do
  q=${spec%%:*}; n=${spec##*:}
  node tools/shot.mjs "http://localhost:5173/tools/viewtest.html?$q" tools/shots/${P}_$n.png 1280 720 6000 >/dev/null 2>&1
done
echo done
