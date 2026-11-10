#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p docs/images
ffmpeg -y \
  -loop 1 -t 2.2 -i docs/images/dashboard.png \
  -loop 1 -t 2.6 -i docs/images/editor.png \
  -loop 1 -t 2.2 -i docs/images/dark.png \
  -filter_complex "[0:v]scale=1440:-1,crop=1440:900:0:0,setsar=1[v0];[1:v]scale=1440:-1,crop=1440:900:0:0,setsar=1[v1];[2:v]scale=1440:-1,crop=1440:900:0:0,setsar=1[v2];[v0][v1][v2]concat=n=3:v=1:a=0,fps=8,scale=960:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=48[p];[s1][p]paletteuse=dither=bayer" \
  docs/demo.gif
ls -lh docs/demo.gif
