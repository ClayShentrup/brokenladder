#!/usr/bin/env bash
# Render in 200 s chunks (finished chunks survive a restart), then join with the full mix and encode the upload copy.
set -e
cd "$(dirname "$0")/.."
D=$(node -e "console.log(JSON.parse(require('fs').readFileSync('out/cues.json')).total)")
mkdir -p out/parts; : > out/parts/list.txt; n=0
for from in $(seq 0 200 "$D"); do
  to=$(python3 -c "print(min($from+200, $D))"); f=out/parts/p$n.mp4
  if [ ! -s "$f" ]; then node tools/render.cjs --from "$from" --to "$to" --out parts/p$n.tmp.mp4 > out/parts/p$n.log 2>&1 && mv out/parts/p$n.tmp.mp4 "$f"; fi
  echo "file 'p$n.mp4'" >> out/parts/list.txt; echo "chunk $n done"; n=$((n+1))
done
P=out/parts/pass
ffmpeg -v error -y -f concat -safe 0 -i out/parts/list.txt -i out/mix.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest -movflags +faststart out/common-knowledge.mp4
ffmpeg -v error -y -i out/common-knowledge.mp4 -c:v libx264 -preset medium -b:v 2400k -maxrate 8M -bufsize 16M -pass 1 -passlogfile $P -an -f null /dev/null
ffmpeg -v error -y -i out/common-knowledge.mp4 -c:v libx264 -preset medium -b:v 2400k -maxrate 8M -bufsize 16M -pass 2 -passlogfile $P -c:a aac -b:a 160k -movflags +faststart out/common-knowledge-send.mp4
ls -la out/common-knowledge-send.mp4; ffprobe -v error -show_entries format=duration -of csv=p=0 out/common-knowledge-send.mp4
