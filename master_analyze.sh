#!/usr/bin/env bash
set -euo pipefail

# ──────────────────────────────────────────────────────────────────────────────
# ParkarLabs – MASTER Analyzer (ONE FILE OUTPUT)
# Output: code_documentation/analysis/<timestamp>_master_report.md
# ──────────────────────────────────────────────────────────────────────────────

# Locate repo root (must contain backend/ and frontend/)
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

ROOT="$(detect_repo_root || true)"
if [[ -z "${ROOT:-}" ]]; then
  echo "❌ Could not find repo root (needs backend/ and frontend/). Run inside your ParkarLabs repo."
  exit 1
fi
cd "$ROOT"

TS="$(date +"%Y%m%d_%H%M%S")"
OUT_DIR="$ROOT/code_documentation/analysis"
mkdir -p "$OUT_DIR"
REPORT="$OUT_DIR/${TS}_master_report.md"

log(){ echo "[$(date +"%H:%M:%S")] $*"; }

USE_RG=0; command -v rg >/dev/null 2>&1 && USE_RG=1
sfind(){
  local pattern="$1"; shift
  if [[ $USE_RG -eq 1 ]]; then
    rg --no-ignore -n --hidden -S "$pattern" "$@"
  else
    grep -RInE --exclude-dir=node_modules --exclude-dir=.next --exclude-dir=.git -- "$pattern" "$@"
  fi
}

# ──────────────────────────────────────────────────────────────────────────────
# 0) Initialize report
# ──────────────────────────────────────────────────────────────────────────────
{
  echo "# ParkarLabs – Master Project Report"
  echo "_Generated: $(date -Iseconds)_"
  echo ""
} > "$REPORT"

# ──────────────────────────────────────────────────────────────────────────────
# 1) Environment snapshot
# ──────────────────────────────────────────────────────────────────────────────
log "Environment snapshot…"
{
  echo "## Environment"
  echo "- Repo root: \`$ROOT\`"
  echo "- OS: \`$(uname -a)\`"
  echo "- Bash: \`$BASH_VERSION\`"
  echo "- Node: \`$(command -v node >/dev/null 2>&1 && node -v || echo 'not found')\`"
  echo "- npm:  \`$(command -v npm  >/dev/null 2>&1 && npm -v  || echo 'not found')\`"
  echo "- pnpm: \`$(command -v pnpm >/dev/null 2>&1 && pnpm -v || echo 'not found')\`"
  echo "- yarn: \`$(command -v yarn >/dev/null 2>&1 && yarn -v || echo 'not found')\`"
  echo "- psql: \`$(command -v psql >/dev/null 2>&1 && psql --version || echo 'not found')\`"
  echo ""
} >> "$REPORT"

# ──────────────────────────────────────────────────────────────────────────────
# 2) package.json summaries
# ──────────────────────────────────────────────────────────────────────────────
log "Reading package.json (backend/frontend)…"
summarize_pkg() {
  local PKG="$1" NAME="$2"
  echo "### $NAME package.json" >> "$REPORT"
  if command -v node >/dev/null 2>&1; then
    PKG_PATH="$PKG" node - >> "$REPORT" <<'NODE'
const fs=require('fs');
const p=JSON.parse(fs.readFileSync(process.env.PKG_PATH,'utf8'));
function keys(o){return Object.keys(o||{}).slice(0,20).join(', ')+(Object.keys(o||{}).length>20?'…':'')}
console.log('- name:', p.name||'');
console.log('- version:', p.version||'');
console.log('- scripts:', keys(p.scripts));
console.log('- dependencies:', keys(p.dependencies));
console.log('- devDependencies:', keys(p.devDependencies));
console.log('');
NODE
  else
    echo "Node not found; showing raw:" >> "$REPORT"
    sed -n '1,120p' "$PKG" >> "$REPORT"
    echo "" >> "$REPORT"
  fi
}

[[ -f "$ROOT/backend/package.json"  ]] && summarize_pkg "$ROOT/backend/package.json"  "backend"
[[ -f "$ROOT/frontend/package.json" ]] && summarize_pkg "$ROOT/frontend/package.json" "frontend"

# ──────────────────────────────────────────────────────────────────────────────
# 3) Backend analyzer (mount points, routes, controllers, DB calls)
# ──────────────────────────────────────────────────────────────────────────────
log "Analyzing backend…"
if command -v node >/dev/null 2>&1; then
  NODE_ROOT="$ROOT" node - >> "$REPORT" <<'NODE'
const fs=require('fs'), path=require('path');
const ROOT=process.env.NODE_ROOT, SRC=path.join(ROOT,'backend');
function walk(d,a=[]){ if(!fs.existsSync(d)) return a;
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
    if(['node_modules','.git'].includes(e.name)) continue;
    const p=path.join(d,e.name);
    if(e.isDirectory()) walk(p,a);
    else if(/\.(js|ts)$/.test(e.name)) a.push(p);
  } return a;
}
const files=walk(SRC,[]);
const mountPoints=[];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  const re=/app\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*(require\(['"`]([^'"`]+)['"`]\)|[\w\.]+)/g;
  let m; while((m=re.exec(t))) mountPoints.push({file:f, base:m[1], target:m[3]||m[2]});
}
const routeBase={};
for(const mp of mountPoints){
  const target=mp.target||'';
  if(target.startsWith('./')||target.startsWith('../')){
    const abs=path.resolve(path.dirname(mp.file),target).replace(/\\/g,'/'); (routeBase[abs] ||= []).push(mp.base);
  } else {(routeBase[target] ||= []).push(mp.base);}
}
function parseRoutesFromFile(f){
  const x=fs.readFileSync(f,'utf8'); const routes=[]; const mws=[];
  let u; const useRe=/router\.use\(([^)]+)\)/g; while((u=useRe.exec(x))) mws.push(u[1].trim());
  let m; const methodRe=/router\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]\s*,/gi;
  while((m=methodRe.exec(x))) routes.push({method:m[1].toUpperCase(), path:m[2], middlewares:mws});
  const appRe=/app\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]\s*,/gi;
  while((m=appRe.exec(x))) routes.push({method:m[1].toUpperCase(), path:m[2], middlewares:mws, appLevel:true});
  return {routes, middlewares:mws};
}
// scan ANY files under backend/src/routes/** for robust detection
const routeFiles=files.filter(f=>/\/routes\/.*\.(js|ts)$/.test(f));
const inventory=[];
for(const f of routeFiles){
  const info=parseRoutesFromFile(f);
  const bases=routeBase[f.replace(/\\/g,'/')] || [];
  for(const r of info.routes){
    const full = r.appLevel ? [r.path] : (bases.length? bases.map(b => (b.endsWith('/')?b.slice(0,-1):b)+(r.path.startsWith('/')?'':'/')+r.path) : [r.path]);
    inventory.push({file:f, method:r.method, path:r.path, fullPaths:full, middlewares:r.middlewares, mountedAt:bases});
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
  const re=/\b(query|pool\.query|db\.query)\s*\(\s*`?["'`](.+?)["'`]/gs; let m;
  while((m=re.exec(t))){
    const sn=(m[2]||'').slice(0,120).replace(/\s+/g,' '); dbCalls.push({file:f, snippet:sn+(((m[2]||'').length>120)?'...':'')});
  }
}
const counts = {
  routeFiles: routeFiles.length,
  routes: inventory.length,
  controllers: Object.keys(controllers).length,
  dbQueryFiles: new Set(dbCalls.map(d=>d.file)).size
};

console.log("## Backend");
console.log(`- Route files: **${counts.routeFiles}**`);
console.log(`- Routes detected: **${counts.routes}**`);
console.log(`- Controllers detected: **${counts.controllers}**`);
console.log(`- Files with DB queries: **${counts.dbQueryFiles}**\n`);

console.log("### Mount Points");
for(const mp of mountPoints){ console.log(`- ${mp.base} ⟶ ${mp.target} _(in ${mp.file.replace(process.cwd()+'/','')})_`); }
console.log("");

console.log("### Routes (method path → file)");
for(const r of inventory.sort((a,b)=> (a.fullPaths?.[0]||a.path).localeCompare(b.fullPaths?.[0]||b.path) || a.method.localeCompare(b.method))){
  const full=(r.fullPaths&&r.fullPaths.length)?r.fullPaths.join(', '):r.path;
  console.log(`- [${r.method}] ${full}  — \`${r.file.replace(process.cwd()+'/','')}\``);
}
console.log("");

console.log("### Controllers (heuristic methods)");
for(const [f,methods] of Object.entries(controllers)){
  console.log(`- ${f.replace(process.cwd()+'/','')}: ${methods.join(', ')||'(methods not detected)'}`);
}
console.log("");

console.log("### DB query callsites (first 120 chars)");
for(const q of dbCalls){
  console.log(`- ${q.file.replace(process.cwd()+'/','')}: \`${q.snippet}\``);
}
console.log("");
NODE
else
  echo "## Backend\n(Node not found — skipping backend analysis)\n" >> "$REPORT"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 4) Frontend analyzer (pages/routes + API calls) and Link Map to backend
# ──────────────────────────────────────────────────────────────────────────────
log "Analyzing frontend + linking to backend…"
if command -v node >/dev/null 2>&1; then
  FRONT_DIR="$ROOT/frontend" node - >> "$REPORT" <<'NODE'
const fs=require('fs'), path=require('path');
const FRONT=process.env.FRONT_DIR;

function walk(d,a=[]){ if(!fs.existsSync(d)) return a;
  for(const e of fs.readdirSync(d,{withFileTypes:true})){
    if(['node_modules','.git','.next','.turbo','dist','build'].includes(e.name)) continue;
    const p=path.join(d,e.name);
    if(e.isDirectory()) walk(p,a);
    else if(/\.(tsx?|jsx?)$/.test(e.name)) a.push(p);
  } return a;
}

const files = walk(FRONT,[]);
const pages = files.filter(f=>/(^|\/)(app|src\/app)\/.*\/(page|layout)\.(tsx|jsx)$/.test(f));
const routeHandlers = files.filter(f=>/(^|\/)(app|src\/app)\/.*\/route\.(ts|js)$/.test(f));

// Extract frontend API calls
const rx = {
  fetch: /fetch\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*\{\s*method\s*:\s*['"`]([A-Z]+)['"`])?/g,
  axiosFn: /(axios|apiClient)\.(get|post|put|patch|delete|head|options)\s*\(\s*['"`]([^'"`]+)['"`]/g,
  axiosCfg: /(axios|apiClient)\s*\(\s*\{\s*url\s*:\s*['"`]([^'"`]+)['"`][^}]*method\s*:\s*['"`]([A-Z]+)['"`]/g
};

function normalizeUrl(u){try{
  if(/^https?:\/\//i.test(u)){return new URL(u).pathname;}
  return u.replace(/^(\s*\${[^}]+}\s*)/g,'').replace(/^[^/]+:\/\/[^/]+/,'');
}catch{return u;}}

const calls=[];
for(const f of files){
  const t=fs.readFileSync(f,'utf8');
  let m;
  while((m=rx.fetch.exec(t))) calls.push({file:f, method:(m[2]||'GET').toUpperCase(), url:m[1]});
  while((m=rx.axiosFn.exec(t))) calls.push({file:f, method:m[2].toUpperCase(), url:m[3]});
  while((m=rx.axiosCfg.exec(t))) calls.push({file:f, method:m[3].toUpperCase(), url:m[2]});
}

// Pull backend quick inventory again (lightweight) for matching
function readBackendQuick(){
  const ROOT = process.cwd();
  const backendSrc = path.join(ROOT,'backend');
  const all = [];
  (function walk(d){ if(!fs.existsSync(d)) return;
    for(const e of fs.readdirSync(d,{withFileTypes:true})){
      if(['node_modules','.git'].includes(e.name)) continue;
      const p=path.join(d,e.name); if(e.isDirectory()) walk(p);
      else if(/\.(js|ts)$/.test(e.name)) all.push(p);
    }
  })(backendSrc);

  const mountPoints=[];
  for(const f of all){
    const t=fs.readFileSync(f,'utf8');
    const re=/app\.use\(\s*['"`]([^'"`]+)['"`]\s*,\s*(require\(['"`]([^'"`]+)['"`]\)|[\w\.]+)/g;
    let m; while((m=re.exec(t))) mountPoints.push({file:f, base:m[1], target:m[3]||m[2]});
  }
  const routeBase={};
  for(const mp of mountPoints){
    const target=mp.target||'';
    if(target.startsWith('./')||target.startsWith('../')){
      const abs=path.resolve(path.dirname(mp.file),target).replace(/\\/g,'/'); (routeBase[abs] ||= []).push(mp.base);
    } else {(routeBase[target] ||= []).push(mp.base);}
  }
  function parseRoutesFromFile(f){
    const x=fs.readFileSync(f,'utf8'); const routes=[]; const mws=[];
    let u; const useRe=/router\.use\(([^)]+)\)/g; while((u=useRe.exec(x))) mws.push(u[1].trim());
    let m; const methodRe=/router\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]\s*,/gi;
    while((m=methodRe.exec(x))) routes.push({method:m[1].toUpperCase(), path:m[2], middlewares:mws});
    const appRe=/app\.(get|post|put|patch|delete|options|head)\s*\(\s*['"`]([^'"`]+)['"`]\s*,/gi;
    while((m=appRe.exec(x))) routes.push({method:m[1].toUpperCase(), path:m[2], middlewares:mws, appLevel:true});
    return {routes, middlewares:mws};
  }
  const routeFiles=all.filter(f=>/\/routes\/.*\.(js|ts)$/.test(f));
  const inventory=[];
  for(const f of routeFiles){
    const info=parseRoutesFromFile(f);
    const bases=routeBase[f.replace(/\\/g,'/')]||[];
    for(const r of info.routes){
      const full=r.appLevel?[r.path]:(bases.length?bases.map(b=>(b.endsWith('/')?b.slice(0,-1):b)+(r.path.startsWith('/')?'':'/')+r.path):[r.path]);
      inventory.push({file:f, method:r.method, path:r.path, fullPaths:full, middlewares:r.middlewares});
    }
  }
  // DB callsites
  const dbCalls=[];
  for(const f of all){
    const t=fs.readFileSync(f,'utf8');
    const re=/\b(query|pool\.query|db\.query)\s*\(\s*`?["'`](.+?)["'`]/gs; let m;
    while((m=re.exec(t))){
      dbCalls.push({file:f});
    }
  }
  return {inventory, dbFiles:new Set(dbCalls.map(d=>d.file))};
}

const back = readBackendQuick();
function matchCall(c){
  const p = normalizeUrl(c.url);
  if(!p.startsWith('/')) return null;
  const cands=[];
  for(const r of back.inventory){
    for(const fp of (r.fullPaths&&r.fullPaths.length?r.fullPaths:[r.path])){
      if(!fp) continue;
      const sameMethod=(r.method||'GET')===c.method;
      if(!sameMethod) continue;
      if(p===fp || p.startsWith((fp.endsWith('/')?fp:fp+'/'))){ cands.push({route:r, base:fp}); }
    }
  }
  cands.sort((a,b)=> (b.base?.length||0)-(a.base?.length||0));
  return cands[0]||null;
}

const matches=[];
let matched=0, unmatched=0;
for(const c of calls){
  const hit=matchCall(c);
  if(hit){ matched++; matches.push({ ...c, backend_path: hit.base, route_file: hit.route.file, db: back.dbFiles.has(hit.route.file) }); }
  else { unmatched++; matches.push({ ...c, backend_path: null, route_file: null, db: false }); }
}

console.log("## Frontend");
console.log(`- Frontend source files scanned: **${files.length}**`);
console.log(`- Pages/layouts detected: **${pages.length}**`);
console.log(`- app route handlers (route.ts/js): **${routeHandlers.length}**\n`);

console.log("### Frontend API calls (matched to backend)");
console.log(`- Total API calls found: **${calls.length}**`);
console.log(`- Matched to backend routes: **${matched}**`);
console.log(`- Unmatched: **${unmatched}**\n`);

console.log("| Method | Frontend File | URL | Backend Path | Route File | DB? |");
console.log("|---|---|---|---|---|---|");
for(const L of matches){
  const f = (L.file||'').replace(process.cwd()+'/','');
  const rf= L.route_file ? L.route_file.replace(process.cwd()+'/','') : '—';
  console.log(`| ${L.method} | ${f} | ${L.url} | ${L.backend_path ?? '—'} | ${rf} | ${L.db?'Yes':'No'} |`);
}
console.log("");
NODE
else
  echo "## Frontend\n(Node not found — skipping frontend analysis)\n" >> "$REPORT"
fi

# ──────────────────────────────────────────────────────────────────────────────
# 5) Database summary (brief list of object names)
# ──────────────────────────────────────────────────────────────────────────────
log "Summarizing database objects…"
{
  echo "## Database (brief summary)"
  if find "$ROOT/db" -type f -name "*.sql" | grep -q .; then
    echo ""
    echo "### Tables"
    find "$ROOT/db" -type f -name "*.sql" -print0 \
      | xargs -0 awk '
        BEGIN{IGNORECASE=1}
        /CREATE[[:space:]]+TABLE/ {
          s=$0
          if (match(s, /CREATE[[:space:]]+TABLE[[:space:]]+(IF[[:space:]]+NOT[[:space:]]+EXISTS[[:space:]]+)?([a-zA-Z0-9_\.]+)/, m)) {
            print "- " m[2]
          }
        }'
    echo ""
    echo "### Functions"
    find "$ROOT/db" -type f -name "*.sql" -print0 \
      | xargs -0 awk '
        BEGIN{IGNORECASE=1}
        /CREATE[[:space:]]+FUNCTION/ {
          s=$0
          if (match(s, /CREATE[[:space:]]+FUNCTION[[:space:]]+([a-zA-Z0-9_\.]+)/, m)) {
            print "- " m[1]
          }
        }'
    echo ""
    echo "### Triggers"
    find "$ROOT/db" -type f -name "*.sql" -print0 \
      | xargs -0 awk '
        BEGIN{IGNORECASE=1}
        /CREATE[[:space:]]+TRIGGER/ {
          s=$0
          if (match(s, /CREATE[[:space:]]+TRIGGER[[:space:]]+([a-zA-Z0-9_\.]+)/, m)) {
            print "- " m[1]
          }
        }'
    echo ""
    echo "### Views"
    find "$ROOT/db" -type f -name "*.sql" -print0 \
      | xargs -0 awk '
        BEGIN{IGNORECASE=1}
        /CREATE[[:space:]]+VIEW/ {
          s=$0
          if (match(s, /CREATE[[:space:]]+VIEW[[:space:]]+([a-zA-Z0-9_\.]+)/, m)) {
            print "- " m[1]
          }
        }'
    echo ""
  else
    echo "_No .sql files found under db/_"
    echo ""
  fi
} >> "$REPORT"

# ──────────────────────────────────────────────────────────────────────────────
# 6) Final note + optional Windows copy
# ──────────────────────────────────────────────────────────────────────────────
echo "✅ Master report saved to: $REPORT"
# Auto-copy to Windows if path exists
if [[ -d "/mnt/c/Users/Nirmit.Panchal/filo" ]]; then
  cp "$REPORT" "/mnt/c/Users/Nirmit.Panchal/filo/" 2>/dev/null || true
  echo "📁 Copied to Windows: /mnt/c/Users/Nirmit.Panchal/filo/$(basename "$REPORT")"
fi
