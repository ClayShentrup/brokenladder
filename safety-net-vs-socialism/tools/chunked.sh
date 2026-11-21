#!/bin/bash
# Restart-safe render: 300 s video chunks (skips finished ones), then one audio mux and an upload-size copy.
set -e
cd "$(dirname "$0")/.."
mkdir -p out/parts
DUR=$(node tools/render.cjs --stills 0 2>/dev/null | grep -o 'duration [0-9.]*' | cut -d' ' -f2)
N=$(python3 -c "import math;print(math.ceil($DUR/300))")
for ((i=0;i<N;i++)); do
  f=out/parts/p$i.mp4
  [ -s "$f" ] && continue
  node tools/render.cjs --from $((i*300)) --to $(((i+1)*300)) --out parts/p$i.tmp.mp4 && mv out/parts/p$i.tmp.mp4 $f
done
rm -f out/parts/list.txt; for ((i=0;i<N;i++)); do echo "file 'p$i.mp4'" >> out/parts/list.txt; done
GAIN=$(ffmpeg -hide_banner -i out/mix.wav -af ebur128 -f null - 2>&1 | grep -A1 "Integrated loudness" | grep -o '\-\?[0-9.]* LUFS' | head -1 | cut -d' ' -f1)
GDB=$(python3 -c "print(round(-14-($GAIN),2))")
ffmpeg -v error -y -f concat -safe 0 -i out/parts/list.txt -i out/mix.wav -map 0:v -map 1:a -c:v copy -af "volume=${GDB}dB,alimiter=limit=0.79:attack=5:release=60:level=disabled" -ar 48000 -c:a aac -b:a 192k -shortest -movflags +faststart out/economic-illiteracy.mp4
cd out
ffmpeg -v error -y -i economic-illiteracy.mp4 -c:v libx264 -preset slow -b:v 1650k -pass 1 -an -f null /dev/null
ffmpeg -v error -y -i economic-illiteracy.mp4 -c:v libx264 -preset slow -b:v 1650k -pass 2 -c:a aac -b:a 160k -movflags +faststart economic-illiteracy-send.mp4
ls -la economic-illiteracy*.mp4
