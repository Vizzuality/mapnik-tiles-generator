#!/bin/bash
#
# Please use complete path for file and styles

node tile-generator \
  file=examples/final.tif \
  styles=examples/style.mss \
  dest=tmp/tiles \
  min_zoom=1 \
  max_zoom=2 \
  threads=2 \
  format=png
