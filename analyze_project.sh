#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# ParkarLabs – Project Master Analyzer (FINAL)
# - Auto-detects repo root (needs backend/ and frontend/)
# - Scans backend (Express), frontend (Next.js), db (SQL)
# - Outputs to code_documentation/analysis/<timestamp>/
###############################################################################

# ──────────────────────────────────────────────────────────────────────────────
# Locate repo root
# ──────────────────────────────────────────────────────────────────────────────
detect_repo_root() {
  local start="$PWD"
  if [[ -d "$start/backend" && -d "$start/frontend" ]]; then echo "$start"; return 0; fi
  if [[ -d "$start/ParkarLabs/backend" && -d "$start/ParkarLabs/frontend" ]]; then echo "$start/ParkarLabs"; return 0; fi
  local d="$start"
  while [[ "$d" != "/" ]]; do
    if [[ -d "$d/backend" && -d "$d/frontend" ]]; then echo "$d"; return 0; fi
    d="$(dirname "$d")"
  done
  return 1
}

if ! ROOT="$(detect_repo_root)"; then
  echo "Could not find repo root (needs backend/ and frontend/). Run inside your ParkarLabs repo."
  exit 1
fi
cd "$ROOT"

TS="$(date +"%Y%m%d_%H%M%S")"
OUT_DIR="$ROOT/code_documentation/analysis/$TS"
mkdir -p "$OUT_DIR/backend" "$OUT_DIR/frontend" "$OUT_DIR/db"

log() { echo "[$(date +"%H:%M:%S")] $*"; }

USE_RG=0; command -v rg >/dev/null 2>&1 && USE_RG=1
sfind() {
  local pattern="$1"; shift
  if [[ $USE_RG -eq 1 ]]; then rg --no-ignore -n --hidden -S "$pattern" "$@"
  else grep -RInE --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git -- "$pattern" "$@"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# 1) Environment snapshot
# ──────────────────────────────────────────────────────────────────────────────
log "Capturing environment snapshot..."
{
  echo "# Environment"
  echo "Date: $(date -Iseconds)"
  echo "Repo root: $ROOT"
  echo "## Versions"
  echo "- Bash: $BASH_VERSION"
  echo "- OS: $(uname -a)"
  echo "- Node: $(command -v node >/dev/null 2>&1 && node -v || echo 'node not found')"
  echo "- npm:  $(command -v npm  >/dev/null 2>&1 && npm -v  || echo 'npm not found')"
  echo "- pnpm: $(command -v pnpm >/dev/null 2>&1 && pnpm -v || echo 'pnpm not found')"
  echo "- yarn: $(command -v yarn >/dev/null 2>&1 && yarn -v || echo 'yarn not found')"
  echo "- psql: $(command -v psql >/dev/null 2>&1 && psql --version || echo 'psql not found')"
} > "$OUT_DIR/00_environment.md"

# ──────────────────────────────────────────────────────────────────────────────
# 2) package.json info (env var into node)
# ──────────────────────────────────────────────────────────────────────────────
log "Recording package.json info..."
for PKG in "$ROOT/backend/package.json" "$ROOT/frontend/package.json"; do
  [[ ! -f "$PKG" ]] && continue
  NAME="$(basename "$(dirname "$PKG")")"
  DEST="$OUT_DIR/01_${NAME}_package.json.md"
  echo "# $NAME/package.json" > "$DEST"
  if command -v node >/dev/null 2>&1; then
    PKG_PATH="$PKG" node - >> "$DEST" <<'NODE'
const fs = require('fs');
const pkgPath = process.env.PKG_PATH;
const p = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
console.log('## name:', p.name || '');
console.log('## version:', p.version || '');
console.log('\n### scripts');
for (const [k,v] of Object.entries(p.scripts||{})) console.log('-', k, ':', v);
console.log('\n### dependencies');
for (const [k,v] of Object.entries(p.dependencies||{})) console.log('-', k, ':', v);
console.log('\n### devDependencies');
for (const [k,v] of Object.entries(p.devDependencies||{})) console.log('-', k, ':', v);
NODE
  else
    cat "$PKG" >> "$DEST"
  fi
done

# ──────────────────────────────────────────────────────────────────────────────
# 3) Backend analysis – routes/controllers/db calls
# ──────────────────────────────────────────────────────────────────────────────
log "Analyzing backend routes/controllers..."
if command -v node >/dev/null 2>&1; then
  NODE_ROOT="$ROOT" node - > "$OUT_DIR/backend/routes_inventory.json" <<'NODEPARSER'
const fs = require('fs'); const path = require('path');
const ROOT = process.env.NODE_ROOT; const SRC = path.join(ROOT,'backend');

function walk(d,a=[]){ if(!fs.existsSync(d)) return a;
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
    if(['node_modules','.git'].includes(e.name)) continue;
    const p=path.join(d,e.name);
    if(e.isDirectory()) walk(p,a);
    else if(/\.(js|ts)$/.test(e.name)) a.push(p);
  } return a;
}
const files = walk(SRC, []);
const mountPoints=[]; 
for(const f of files){ const t=fs.readFileSync(f,'utf8'); 
  const re=/app\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*(require\(['"`]([^'"`]+)['"`]\)|[\w\.]+)/g; 
  let m; while((m=re.exec(t))) mountPoints.push({file:f, base:m[1], target:m[3]||m[2]});
}
const routeBase={};
for(const mp of mountPoints){
  let target = mp.target || '';
  if(target.startsWith('./') || target.startsWith('../')){
    const abs = path.resolve(path.dirname(mp.file), target).replace(/\\/g,'/');
    (routeBase[abs] ||= []).push(mp.base);
  } else {
    (routeBase[target] ||= []).push(mp.base);
  }
}
function parseRoutesFromFile(f){
  const x=fs.readFileSync(f,'utf8');
  const routes=[]; const mws=[];
  let u; const useRe=/router\.use\(([^)]+)\)/g; while((u=useRe.exec(x))) mws.push(u[1].trim());
  let m; const methodRe=/router\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]\s*,/gi;
  while((m=methodRe.exec(x))) routes.push({method:m[1].toUpperCase(), path:m[2], middlewares:mws});
  const appRe=/app\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]\s*,/gi;
  while((m=appRe.exec(x))) routes.push({method:m[1].toUpperCase(), path:m[2], middlewares:mws, appLevel:true});
  const handlerRe=/router\.(get|post|put|patch|delete)\s*\(\s*['"`][^'"`]+['"`]\s*,\s*([A-Za-z0-9_\.]+)\b/g;
  const handlers=[]; let h; while((h=handlerRe.exec(x))) handlers.push(h[2]);
  return { routes, middlewares:mws, handlers };
}
const inventory=[];
for(const f of files.filter(f=>/routes?\.(js|ts)$/.test(f))){
  const info=parseRoutesFromFile(f);
  const bases=routeBase[f.replace(/\\/g,'/')]||[];
  for(const r of info.routes){
    const full = r.appLevel ? [r.path]
      : (bases.length ? bases.map(b => (b.endsWith('/')?b.slice(0,-1):b)+(r.path.startsWith('/')?'':'/')+r.path) : [r.path]);
    inventory.push({ file:f, method:r.method, path:r.path, mountedAt:bases, fullPaths:full, middlewares:r.middlewares });
  }
}
const controllers={};
for(const f of files.filter(f=>/controllers?\/.*\.(js|ts)$/.test(f))){
  const t=fs.readFileSync(f,'utf8');
  const re=/([A-Za-z0-9_]+)\s*:\s*async\s*\(|async\s+([A-Za-z0-9_]+)\s*\(|([A-Za-z0-9_]+)\s*\(\s*req\s*,\s*res/g;
  const s=new Set(); let m; while((m=re.exec(t))) s.add(m[1]||m[2]||m[3]);
  controllers[f]=[...s];
}
const dbCalls=[];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const re=/\b(query|pool\.query|db\.query)\s*\(\s*`?["'`](.+?)["'`]/gs;
  let m; while((m=re.exec(t))){
    const sn=(m[2]||'').slice(0,120).replace(/\s+/g,' '); dbCalls.push({file:f, snippet: sn + ((m[2]||'').length>120?'...':'')});
  }
}
console.log(JSON.stringify({ mountPoints, inventory, controllers, dbCalls }, null, 2));
NODEPARSER
else
  echo "{}" > "$OUT_DIR/backend/routes_inventory.json"
fi

# Pretty backend report
INV_JSON="$OUT_DIR/backend/routes_inventory.json"
if command -v node >/dev/null 2>&1; then
  INV_PATH="$INV_JSON" node - > "$OUT_DIR/backend/backend_report.md" <<'NODE'
const fs=require('fs');
const inv=JSON.parse(fs.readFileSync(process.env.INV_PATH,'utf8'));
const out=[];
out.push("# Backend Report\n");
out.push("## Mount Points\n");
for(const mp of (inv.mountPoints||[])){ out.push(`- **${mp.base}** ⟶ ${mp.target}  _(in ${mp.file.replace(process.cwd()+'/','')})_`); }
out.push("\n## Routes Inventory");
if(!(inv.inventory||[]).length) out.push("\n*(no routes found)*");
for(const r of (inv.inventory||[]).sort((a,b)=> (a.fullPaths?.[0]||a.path).localeCompare(b.fullPaths?.[0]||b.path) || a.method.localeCompare(b.method))){
  const full=(r.fullPaths&&r.fullPaths.length)?r.fullPaths.join(', '):r.path;
  out.push(`- [${r.method}] ${full}  \n  file: \`${r.file.replace(process.cwd()+'/','')}\`  middlewares: \`${(r.middlewares||[]).join(', ')}\``);
}
out.push("\n## Controllers & Methods (heuristic)");
for(const [f,methods] of Object.entries(inv.controllers||{})){ if(!methods.length) continue; out.push(`- ${f.replace(process.cwd()+'/','')}: ${methods.join(', ')}`); }
out.push("\n## Files with DB Queries (first 120 chars)");
for(const q of (inv.dbCalls||[])){ out.push(`- ${q.file.replace(process.cwd()+'/','')}: \`${q.snippet}\``); }
console.log(out.join('\n'));
NODE
else
  echo "# Backend Report\n\n(Node not found)\n" > "$OUT_DIR/backend/backend_report.md"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4) Frontend analysis – Next.js
# ──────────────────────────────────────────────────────────────────────────────
log "Analyzing frontend (Next.js) pages and API routes..."
FRONT_SRC="$ROOT/frontend"
find "$FRONT_SRC" -path "$FRONT_SRC/node_modules" -prune -o -type f \( -name "page.tsx" -o -name "page.jsx" -o -name "layout.tsx" -o -name "layout.jsx" -o -name "route.ts" -o -name "route.js" \) \
  | sed "s|$ROOT/||" > "$OUT_DIR/frontend/paths.txt" || true

if command -v node >/dev/null 2>&1; then
  FRONT_DIR="$FRONT_SRC" node - > "$OUT_DIR/frontend/api_routes.json" <<'NODE'
const fs=require('fs'); const path=require('path'); const FRONT=process.env.FRONT_DIR;
function walk(d,a=[]){ if(!fs.existsSync(d)) return a;
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
    if(['node_modules','.git','.next'].includes(e.name)) continue;
    const p=path.join(d,e.name);
    if(e.isDirectory()) walk(p,a);
    else if(/route\.(ts|js)$/.test(e.name)) a.push(p);
  } return a;
}
const files=walk(FRONT,[]), entries=[];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const methods=[];
  const re1=/export\s+(?:async\s+)?function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*\(/g;
  const re2=/export\s+const\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s*=/g;
  let m; while((m=re1.exec(t))) methods.push(m[1]); while((m=re2.exec(t))) methods.push(m[1]);
  entries.push({ file:f.replace(process.cwd()+'/',''), methods:[...new Set(methods)] });
}
console.log(JSON.stringify(entries,null,2));
NODE
else
  echo "[]" > "$OUT_DIR/frontend/api_routes.json"
fi

sfind "create\\((axios|Axios)" "$FRONT_SRC" > "$OUT_DIR/frontend/api_client_search.txt" || true
sfind "NEXT_PUBLIC_API_URL"     "$FRONT_SRC" >> "$OUT_DIR/frontend/api_client_search.txt" || true
sfind "apiClient"               "$FRONT_SRC" >> "$OUT_DIR/frontend/api_client_search.txt" || true

# ──────────────────────────────────────────────────────────────────────────────
# 5) DB analysis – SQL summary and docs
# ──────────────────────────────────────────────────────────────────────────────
log "Summarizing DB schema from db/…"
DB_DIR="$ROOT/db"
for f in tables_complete.md functions_complete.md enums_types.md database_analysis_complete.txt; do
  [[ -f "$ROOT/$f"    ]] && cp "$ROOT/$f"    "$OUT_DIR/db/" || true
  [[ -f "$ROOT/db/$f" ]] && cp "$ROOT/db/$f" "$OUT_DIR/db/" || true
done

SQL_SUMMARY="$OUT_DIR/db/sql_summary.md"
echo "# DB SQL Summary" > "$SQL_SUMMARY"; echo "" >> "$SQL_SUMMARY"
if find "$DB_DIR" -type f -name "*.sql" | grep -q .; then
  while IFS= read -r f; do
    echo "## ${f#$ROOT/}" >> "$SQL_SUMMARY"; echo "" >> "$SQL_SUMMARY"
    awk 'BEGIN{IGNORECASE=1}
      /CREATE[[:space:]]+TABLE/ || /CREATE[[:space:]]+FUNCTION/ || /CREATE[[:space:]]+TRIGGER/ || /CREATE[[:space:]]+VIEW/ {printing=1}
      printing==1 {print}
      /;[[:space:]]*$/ && printing==1 {printing=0; print "\n"}' "$f" >> "$SQL_SUMMARY"
  done < <(find "$DB_DIR" -type f -name "*.sql" | sort)
else
  echo "_No .sql files found under db/_" >> "$SQL_SUMMARY"
fi

sfind "CREATE TABLE"    "$DB_DIR" > "$OUT_DIR/db/tables_grep.txt"    || true
sfind "CREATE FUNCTION" "$DB_DIR" > "$OUT_DIR/db/functions_grep.txt" || true
sfind "CREATE TRIGGER"  "$DB_DIR" > "$OUT_DIR/db/triggers_grep.txt"  || true
sfind "CREATE VIEW"     "$DB_DIR" > "$OUT_DIR/db/views_grep.txt"     || true

# ──────────────────────────────────────────────────────────────────────────────
# 6) Cross-link overview
# ──────────────────────────────────────────────────────────────────────────────
log "Building cross-link overview…"
INV_PATH="$OUT_DIR/backend/routes_inventory.json"
if command -v node >/dev/null 2>&1; then
  X_INV="$INV_PATH" node - > "$OUT_DIR/10_crosslink_overview.md" <<'NODE'
const fs=require('fs');
const invPath=process.env.X_INV;
if(!fs.existsSync(invPath)){ console.log("# API Crosslink Overview\n\n(No inventory found)\n"); process.exit(0); }
const data=JSON.parse(fs.readFileSync(invPath,'utf8'));
const out=[];
out.push("# API Crosslink Overview\n");
out.push("Links **mounted route paths** to files and flags middlewares.\n");
const byFile={};
for(const r of (data.inventory||[])){ (byFile[r.file] ||= []).push(r); }
for(const [file,routes] of Object.entries(byFile)){
  out.push(`\n## ${file.replace(process.cwd()+'/','')}`);
  for(const r of routes){
    const full=(r.fullPaths&&r.fullPaths.length)?r.fullPaths.join(', '):r.path;
    out.push(`- [${r.method}] ${full} — middlewares: ${ (r.middlewares||[]).join(', ') || 'none' }`);
  }
}
out.push("\n---\n## Notes\n- Controller names are visible in the route files.\n- DB query files are listed in **backend_report.md**.\n");
console.log(out.join('\n'));
NODE
else
  echo "# API Crosslink Overview\n\n(Node not found)\n" > "$OUT_DIR/10_crosslink_overview.md"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 7) Final index
# ──────────────────────────────────────────────────────────────────────────────
log "Indexing outputs…"
{
  echo "# ParkarLabs Analysis – $TS"
  echo ""
  echo "## Start here"
  echo "- **00_environment.md** – toolchain snapshot"
  echo "- **backend/backend_report.md** – Express routes, controllers, DB call sites"
  echo "- **backend/routes_inventory.json** – machine-readable routes"
  echo "- **frontend/paths.txt** – Next.js pages & route files"
  echo "- **frontend/api_routes.json** – exported HTTP methods in \`route.ts\` files"
  echo "- **db/sql_summary.md** – extracted CREATE TABLE/FUNCTION/TRIGGER/VIEW"
  echo "- **10_crosslink_overview.md** – route → file overview"
} > "$OUT_DIR/README.md"

log "Done ✅  Reports saved to: $OUT_DIR"
echo "Open $OUT_DIR/README.md to navigate the outputs."
