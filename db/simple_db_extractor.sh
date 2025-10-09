#!/bin/bash

echo "🚀 PARKARLABS - SIMPLE DATABASE ANALYSIS"
echo "=========================================="
echo "📊 Extracting database information..."
echo ""

# Create output file
OUTPUT_FILE="database_analysis_complete.txt"
rm -f $OUTPUT_FILE

echo "PARKARLABS DATABASE COMPLETE ANALYSIS" > $OUTPUT_FILE
echo "=====================================" >> $OUTPUT_FILE
echo "Generated on: $(date)" >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

# Function to add section header
add_section() {
    echo "" >> $OUTPUT_FILE
    echo "=========================================" >> $OUTPUT_FILE
    echo "$1" >> $OUTPUT_FILE
    echo "=========================================" >> $OUTPUT_FILE
    echo "" >> $OUTPUT_FILE
}

# Function to add file content
add_file_content() {
    local file="$1"
    local description="$2"
    
    if [ -f "$file" ]; then
        echo "--- $description ---" >> $OUTPUT_FILE
        echo "File: $file" >> $OUTPUT_FILE
        echo "" >> $OUTPUT_FILE
        cat "$file" >> $OUTPUT_FILE
        echo "" >> $OUTPUT_FILE
        echo "--- End of $description ---" >> $OUTPUT_FILE
        echo "" >> $OUTPUT_FILE
    else
        echo "File not found: $file" >> $OUTPUT_FILE
        echo "" >> $OUTPUT_FILE
    fi
}

# 1. CONFIGURATION FILES
add_section "CONFIGURATION FILES"
add_file_content "package.json" "Package Configuration"
add_file_content "migrate.config.js" "Migration Configuration"
add_file_content "init.sql" "Initial SQL"

# 2. SCHEMAS
add_section "SCHEMAS"
if [ -d "schemas" ]; then
    for file in schemas/*; do
        if [ -f "$file" ]; then
            add_file_content "$file" "Schema: $(basename $file)"
        fi
    done
else
    echo "No schemas directory found" >> $OUTPUT_FILE
fi

# 3. MIGRATIONS (All files)
add_section "MIGRATIONS (COMPLETE CONTENT)"
if [ -d "migrations" ]; then
    for file in migrations/*.js; do
        if [ -f "$file" ]; then
            add_file_content "$file" "Migration: $(basename $file)"
        fi
    done
else
    echo "No migrations directory found" >> $OUTPUT_FILE
fi

# 4. SEEDS
add_section "SEED DATA"
if [ -d "seeds" ]; then
    for file in seeds/*.js; do
        if [ -f "$file" ]; then
            add_file_content "$file" "Seed: $(basename $file)"
        fi
    done
else
    echo "No seeds directory found" >> $OUTPUT_FILE
fi

# 5. SCRIPTS
add_section "UTILITY SCRIPTS"
if [ -d "scripts" ]; then
    for file in scripts/*.sh; do
        if [ -f "$file" ]; then
            add_file_content "$file" "Script: $(basename $file)"
        fi
    done
else
    echo "No scripts directory found" >> $OUTPUT_FILE
fi

# 6. FUNCTIONS LIST
add_section "FUNCTIONS LIST"
add_file_content "functions_list.txt" "Functions List"

# 7. DIRECTORY STRUCTURE
add_section "DIRECTORY STRUCTURE"
echo "Directory listing:" >> $OUTPUT_FILE
ls -la >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
echo "Migration files:" >> $OUTPUT_FILE
ls -la migrations/ >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE
echo "Seed files:" >> $OUTPUT_FILE
ls -la seeds/ >> $OUTPUT_FILE
echo "" >> $OUTPUT_FILE

echo "✅ ANALYSIS COMPLETE!"
echo "📄 Complete analysis saved to: $OUTPUT_FILE"
echo ""
echo "📁 File size: $(du -h $OUTPUT_FILE | cut -f1)"
echo ""
echo "🎯 Next steps:"
echo "1. Review the complete analysis file: $OUTPUT_FILE"
echo "2. Share this file with me for backend/frontend development"
echo ""
echo "To view the file:"
echo "cat $OUTPUT_FILE"
echo "or"
echo "less $OUTPUT_FILE"
