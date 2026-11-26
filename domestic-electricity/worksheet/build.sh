#!/usr/bin/env bash
# Worksheet pipeline: model -> data.json -> figures -> Word file. Run from this folder:  ./build.sh
set -euo pipefail
cd "$(dirname "$0")"
node build_data.cjs     # 1. numbers come from ../model.js
python3 figs.py         # 2. figures read data.json
node worksheet.cjs      # 3. document reads data.json
# 4. optional visual check (needs LibreOffice): soffice --headless --convert-to pdf out/*.docx --outdir out && pdftoppm -jpeg -r 70 out/*.pdf out/page
