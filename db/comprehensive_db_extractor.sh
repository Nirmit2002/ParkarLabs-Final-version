#!/bin/bash

# Fixed Comprehensive Database Information Extractor for ParkarLabs
echo "🚀 PARKARLABS - COMPREHENSIVE DATABASE ANALYSIS"
echo "================================================"
echo "📊 Extracting complete database information..."
echo ""

# Create output directory
mkdir -p analysis_output

# 1. EXTRACT ALL TABLE DEFINITIONS
echo "🗃️  EXTRACTING TABLE STRUCTURES..." > analysis_output/tables_complete.md
echo "=================================" >> analysis_output/tables_complete.md
echo "" >> analysis_output/tables_complete.md

for file in migrations/*.js; do
    if [ -f "$file" ]; then
        echo "## File: $(basename $file)" >> analysis_output/tables_complete.md
        echo "" >> analysis_output/tables_complete.md
        
        # Extract CREATE TABLE statements
        grep -n -A 20 "CREATE TABLE" "$file" >> analysis_output/tables_complete.md
        echo "" >> analysis_output/tables_complete.md
        echo "---" >> analysis_output/tables_complete.md
        echo "" >> analysis_output/tables_complete.md
    fi
done

# 2. EXTRACT ALL FUNCTIONS AND PROCEDURES
echo "⚙️  EXTRACTING FUNCTIONS..." > analysis_output/functions_complete.md
echo "===========================" >> analysis_output/functions_complete.md
echo "" >> analysis_output/functions_complete.md

for file in migrations/*.js; do
    if [ -f "$file" ]; then
        echo "## File: $(basename $file)" >> analysis_output/functions_complete.md
        echo "" >> analysis_output/functions_complete.md
        
        # Extract function definitions
        grep -n -A 30 -B 2 "CREATE.*FUNCTION" "$file" >> analysis_output/functions_complete.md
        echo "" >> analysis_output/functions_complete.md
        echo "---" >> analysis_output/functions_complete.md
        echo "" >> analysis_output/functions_complete.md
    fi
done

# 3. EXTRACT ALL ENUMS AND TYPES
echo "📝 EXTRACTING ENUMS AND CUSTOM TYPES..." > analysis_output/enums_types.md
echo "========================================" >> analysis_output/enums_types.md
echo "" >> analysis_output/enums_types.md

for file in migrations/*.js; do
    if [ -f "$file" ]; then
        echo "## File: $(basename $file)" >> analysis_output/enums_types.md
        echo "" >> analysis_output/enums_types.md
        
        # Extract type definitions
        grep -n -A 10 -B 2 "CREATE TYPE\|AS ENUM" "$file" >> analysis_output/enums_types.md
        echo "" >> analysis_output/enums_types.md
        echo "---" >> analysis_output/enums_types.md
        echo "" >> analysis_output/enums_types.md
    fi
done

echo "✅ ANALYSIS COMPLETE!"
echo ""
echo "📁 All analysis files created in: analysis_output/"
echo ""
echo "Files created:"
echo "- tables_complete.md (All table structures)"
echo "- functions_complete.md (All functions and procedures)"  
echo "- enums_types.md (All custom types and enums)"
echo ""
echo "🎯 Next steps:"
echo "1. Review files in analysis_output/ directory"
echo "2. Share database_analysis_complete.txt with me"
