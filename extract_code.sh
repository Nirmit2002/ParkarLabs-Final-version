#!/bin/bash
# ParkarLabs Complete Code Extraction Script
# This will create organized documentation of your entire codebase

cd /root/ParkarLabs

# Create output directory
mkdir -p code_documentation
cd code_documentation

echo "🚀 Starting ParkarLabs Code Extraction..."
echo "=========================================="

# ============================================
# 1. PROJECT STRUCTURE
# ============================================
echo "📁 Extracting project structure..."
cat > 01_project_structure.txt << 'EOF'
PARKARLABS PROJECT STRUCTURE
============================
Generated: $(date)

Directory Tree:
EOF

cd /root/ParkarLabs
tree -L 3 -I 'node_modules' >> code_documentation/01_project_structure.txt 2>/dev/null || find . -maxdepth 3 -not -path '*/node_modules/*' >> code_documentation/01_project_structure.txt

# ============================================
# 2. BACKEND EXTRACTION
# ============================================
echo "🔧 Extracting backend code..."

cat > code_documentation/02_backend_complete.txt << 'EOF'
BACKEND CODE DOCUMENTATION
==========================

========================================
BACKEND CONFIGURATION FILES
========================================
EOF

echo -e "\n--- package.json ---\n" >> code_documentation/02_backend_complete.txt
cat backend/package.json >> code_documentation/02_backend_complete.txt 2>/dev/null

echo -e "\n--- .env (sanitized) ---\n" >> code_documentation/02_backend_complete.txt
cat backend/.env | sed 's/PGPASSWORD=.*/PGPASSWORD=***/' >> code_documentation/02_backend_complete.txt 2>/dev/null

echo -e "\n========================================\nMAIN SERVER FILE\n========================================\n" >> code_documentation/02_backend_complete.txt
echo "--- src/server.js ---" >> code_documentation/02_backend_complete.txt
cat backend/src/server.js >> code_documentation/02_backend_complete.txt 2>/dev/null

echo -e "\n========================================\nCONTROLLERS\n========================================\n" >> code_documentation/02_backend_complete.txt

for file in backend/src/controllers/*.js; do
    if [ -f "$file" ]; then
        echo -e "\n--- $(basename $file) ---\n" >> code_documentation/02_backend_complete.txt
        cat "$file" >> code_documentation/02_backend_complete.txt
    fi
done

echo -e "\n========================================\nROUTES\n========================================\n" >> code_documentation/02_backend_complete.txt

for file in backend/src/routes/*.js; do
    if [ -f "$file" ]; then
        echo -e "\n--- $(basename $file) ---\n" >> code_documentation/02_backend_complete.txt
        cat "$file" >> code_documentation/02_backend_complete.txt
    fi
done

echo -e "\n========================================\nMIDDLEWARE\n========================================\n" >> code_documentation/02_backend_complete.txt

for file in backend/src/middleware/*.js; do
    if [ -f "$file" ]; then
        echo -e "\n--- $(basename $file) ---\n" >> code_documentation/02_backend_complete.txt
        cat "$file" >> code_documentation/02_backend_complete.txt
    fi
done

echo -e "\n========================================\nCONFIGURATION\n========================================\n" >> code_documentation/02_backend_complete.txt

for file in backend/config/*.js; do
    if [ -f "$file" ]; then
        echo -e "\n--- $(basename $file) ---\n" >> code_documentation/02_backend_complete.txt
        cat "$file" >> code_documentation/02_backend_complete.txt
    fi
done

# ============================================
# 3. FRONTEND EXTRACTION
# ============================================
echo "🎨 Extracting frontend code..."

cat > code_documentation/03_frontend_complete.txt << 'EOF'
FRONTEND CODE DOCUMENTATION
===========================

========================================
FRONTEND CONFIGURATION FILES
========================================
EOF

echo -e "\n--- package.json ---\n" >> code_documentation/03_frontend_complete.txt
cat frontend/package.json >> code_documentation/03_frontend_complete.txt 2>/dev/null

echo -e "\n--- next.config.js ---\n" >> code_documentation/03_frontend_complete.txt
cat frontend/next.config.js >> code_documentation/03_frontend_complete.txt 2>/dev/null

echo -e "\n--- tailwind.config.js ---\n" >> code_documentation/03_frontend_complete.txt
cat frontend/tailwind.config.js >> code_documentation/03_frontend_complete.txt 2>/dev/null

echo -e "\n========================================\nPAGES - ROOT LEVEL\n========================================\n" >> code_documentation/03_frontend_complete.txt

for file in frontend/pages/*.js; do
    if [ -f "$file" ]; then
        echo -e "\n--- $(basename $file) ---\n" >> code_documentation/03_frontend_complete.txt
        cat "$file" >> code_documentation/03_frontend_complete.txt
    fi
done

echo -e "\n========================================\nPAGES - AUTH\n========================================\n" >> code_documentation/03_frontend_complete.txt

for file in frontend/pages/auth/*.js; do
    if [ -f "$file" ]; then
        echo -e "\n--- auth/$(basename $file) ---\n" >> code_documentation/03_frontend_complete.txt
        cat "$file" >> code_documentation/03_frontend_complete.txt
    fi
done

echo -e "\n========================================\nPAGES - ADMIN\n========================================\n" >> code_documentation/03_frontend_complete.txt

for file in frontend/pages/admin/*.js; do
    if [ -f "$file" ]; then
        echo -e "\n--- admin/$(basename $file) ---\n" >> code_documentation/03_frontend_complete.txt
        cat "$file" >> code_documentation/03_frontend_complete.txt
    fi
done

echo -e "\n========================================\nPAGES - USER\n========================================\n" >> code_documentation/03_frontend_complete.txt

for file in frontend/pages/user/*.js; do
    if [ -f "$file" ]; then
        echo -e "\n--- user/$(basename $file) ---\n" >> code_documentation/03_frontend_complete.txt
        cat "$file" >> code_documentation/03_frontend_complete.txt
    fi
done

echo -e "\n========================================\nSTYLES\n========================================\n" >> code_documentation/03_frontend_complete.txt

if [ -f "frontend/styles/globals.css" ]; then
    echo -e "\n--- globals.css ---\n" >> code_documentation/03_frontend_complete.txt
    cat frontend/styles/globals.css >> code_documentation/03_frontend_complete.txt
fi

# ============================================
# 4. DATABASE SUMMARY
# ============================================
echo "💾 Creating database summary..."

cat > code_documentation/04_database_summary.txt << 'EOF'
DATABASE SUMMARY
================

This references your existing database analysis files:
- database_analysis_complete.txt
- tables_complete.md
- functions_complete.md
- enums_types.md

Current Database State:
- 4 users
- 2 courses
- 5 tasks
- Complete schema with 25+ tables
EOF

# ============================================
# 5. API ENDPOINTS MAP
# ============================================
echo "🗺️ Mapping API endpoints..."

cat > code_documentation/05_api_endpoints.txt << 'EOF'
API ENDPOINTS DOCUMENTATION
===========================

Extracting all route definitions...

EOF

grep -r "router\." backend/src/routes/ --include="*.js" 2>/dev/null >> code_documentation/05_api_endpoints.txt || echo "No routes found" >> code_documentation/05_api_endpoints.txt

# ============================================
# 6. FEATURE STATUS
# ============================================
echo "📊 Creating feature status report..."

cat > code_documentation/06_feature_status.txt << 'EOF'
FEATURE IMPLEMENTATION STATUS
==============================

Analyzing what's implemented vs what's missing...

BACKEND FILES:
EOF

echo -e "\nControllers:" >> code_documentation/06_feature_status.txt
ls -1 backend/src/controllers/*.js 2>/dev/null | sed 's|backend/src/controllers/||' >> code_documentation/06_feature_status.txt || echo "None found" >> code_documentation/06_feature_status.txt

echo -e "\nRoutes:" >> code_documentation/06_feature_status.txt
ls -1 backend/src/routes/*.js 2>/dev/null | sed 's|backend/src/routes/||' >> code_documentation/06_feature_status.txt || echo "None found" >> code_documentation/06_feature_status.txt

echo -e "\nFRONTEND PAGES:" >> code_documentation/06_feature_status.txt

echo -e "\nAdmin Pages:" >> code_documentation/06_feature_status.txt
ls -1 frontend/pages/admin/*.js 2>/dev/null | sed 's|frontend/pages/admin/||' >> code_documentation/06_feature_status.txt || echo "None found" >> code_documentation/06_feature_status.txt

echo -e "\nUser Pages:" >> code_documentation/06_feature_status.txt
ls -1 frontend/pages/user/*.js 2>/dev/null | sed 's|frontend/pages/user/||' >> code_documentation/06_feature_status.txt || echo "None found" >> code_documentation/06_feature_status.txt

# ============================================
# 7. DEPENDENCIES
# ============================================
echo "📦 Extracting dependencies..."

cat > code_documentation/07_dependencies.txt << 'EOF'
PROJECT DEPENDENCIES
====================

BACKEND DEPENDENCIES:
EOF

if [ -f "backend/package.json" ]; then
    echo -e "\nInstalled packages:" >> code_documentation/07_dependencies.txt
    grep -A 100 '"dependencies"' backend/package.json | grep -B 100 '}' >> code_documentation/07_dependencies.txt
fi

echo -e "\n\nFRONTEND DEPENDENCIES:" >> code_documentation/07_dependencies.txt

if [ -f "frontend/package.json" ]; then
    echo -e "\nInstalled packages:" >> code_documentation/07_dependencies.txt
    grep -A 100 '"dependencies"' frontend/package.json | grep -B 100 '}' >> code_documentation/07_dependencies.txt
fi

# ============================================
# 8. TODO AND MISSING FEATURES
# ============================================
echo "📝 Creating TODO list..."

cat > code_documentation/08_todo_analysis.txt << 'EOF'
TODO AND MISSING FEATURES
=========================

Searching for TODO comments and incomplete features...

EOF

echo -e "\nTODO comments in backend:" >> code_documentation/08_todo_analysis.txt
grep -r "TODO\|FIXME\|XXX" backend/src/ 2>/dev/null >> code_documentation/08_todo_analysis.txt || echo "None found" >> code_documentation/08_todo_analysis.txt

echo -e "\n\nTODO comments in frontend:" >> code_documentation/08_todo_analysis.txt
grep -r "TODO\|FIXME\|XXX" frontend/pages/ 2>/dev/null >> code_documentation/08_todo_analysis.txt || echo "None found" >> code_documentation/08_todo_analysis.txt

# ============================================
# COMPLETION
# ============================================

cd /root/ParkarLabs/code_documentation

echo ""
echo "=========================================="
echo "✅ EXTRACTION COMPLETE!"
echo "=========================================="
echo ""
echo "📁 Documentation files created in: /root/ParkarLabs/code_documentation/"
echo ""
echo "Files created:"
ls -lh *.txt
echo ""
echo "📊 Total size:"
du -sh .
echo ""
echo "🔍 To view any file:"
echo "   cat code_documentation/01_project_structure.txt"
echo "   cat code_documentation/02_backend_complete.txt"
echo "   cat code_documentation/03_frontend_complete.txt"
echo ""
echo "📤 To share all files with me:"
echo "   cat code_documentation/*.txt"
echo ""
