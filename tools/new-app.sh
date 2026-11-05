#!/usr/bin/env bash
# Create a new app from _template.   bash tools/new-app.sh <folder-name> "Title" "Landing page card text"
set -euo pipefail
cd "$(dirname "$0")/.."
name="${1:?folder name, e.g. spring-constant}"; title="${2:?Title, e.g. Spring Constant}"; blurb="${3:-Interactive practical simulation and worksheet.}"
[[ "$name" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Folder name: lowercase letters, digits and hyphens only"; exit 1; }
[ -e "$name" ] && { echo "$name already exists"; exit 1; }
mkdir "$name"
(cd _template && tar --exclude='worksheet/out' --exclude='worksheet/data.json' --exclude='worksheet/*.png' --exclude='__pycache__' -cf - .) | (cd "$name" && tar -xf -)
python3 - "$name" "$title" "$blurb" <<'PY'
import sys, re
name, title, blurb = sys.argv[1:4]
for f in (f"{name}/index.html", f"{name}/worksheet/worksheet.cjs"):
    s = open(f).read().replace("Pendulum Timing", title).replace("PENDULUM TIMING", title.upper()).replace("Pendulum_Timing_worksheet", name + "_worksheet")
    open(f, "w").write(s)
card = f'''      <a class="card" href="{name}/">
        <strong>{title}</strong>
        <p>{blurb}</p>
      </a>
'''
s = open("index.html").read()
assert "    </div>\n  </main>" in s, "landing page layout changed"
open("index.html", "w").write(s.replace("    </div>\n  </main>", card + "    </div>\n  </main>", 1))
r = open("README.md").read().rstrip("\n") + f"\n| `{name}/` | {title}: {blurb} |\n"
open("README.md", "w").write(r)
PY
echo "Created $name/. Next: edit $name/README.md (physics and assumptions) and $name/model.js, then follow docs/BUILD-RECIPE.md."
