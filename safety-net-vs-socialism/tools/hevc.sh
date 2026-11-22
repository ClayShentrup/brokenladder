#!/bin/bash
# upload copy: two-pass HEVC sized just under the 400 MiB transfer cap
set -e
cd "$(dirname "$0")/../out"
D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 economic-illiteracy.mp4)
BR=$(python3 -c "print(int((395*1024*1024*8/$D - 160000)/1000))")
echo "video bitrate ${BR}k"
ffmpeg -v error -y -i economic-illiteracy.mp4 -c:v libx265 -preset medium -b:v ${BR}k -x265-params pass=1:log-level=error -an -f null /dev/null
ffmpeg -v error -y -i economic-illiteracy.mp4 -c:v libx265 -preset medium -b:v ${BR}k -x265-params pass=2:log-level=error -tag:v hvc1 -c:a aac -b:a 160k -movflags +faststart economic-illiteracy-send.mp4
ls -la economic-illiteracy-send.mp4
