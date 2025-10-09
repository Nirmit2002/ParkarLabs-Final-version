// JavaScript Database Analyzer for ParkarLabs
const fs = require('fs');
const path = require('path');

class DatabaseAnalyzer {
    constructor() {
        this.analysis = {
            tables: {},
            functions: [],
            enums: []
        };
    }

    extractTableInfo(migrationContent, fileName) {
        const tableCreations = migrationContent.match(/CREATE TABLE[\s\S]*?;/gi) || [];
        
        tableCreations.forEach(tableSQL => {
            const tableName = this.extractTableName(tableSQL);
            if (tableName) {
                this.analysis.tables[tableName] = {
                    columns: this.extractColumns(tableSQL),
                    source: fileName
                };
            }
        });
    }

    extractTableName(sql) {
        const match = sql.match(/CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)/i);
        return match ? match[1] : null;
    }

    extractColumns(sql) {
        const columns = [];
        const columnSection = sql.match(/\(([\s\S]*)\)/);
        if (columnSection) {
            const columnLines = columnSection[1].split(',');
            columnLines.forEach(line => {
                const trimmed = line.trim();
                if (trimmed && !trimmed.startsWith('CONSTRAINT') && !trimmed.startsWith('FOREIGN KEY')) {
                    const parts = trimmed.split(/\s+/);
                    if (parts.length >= 2) {
                        columns.push({
                            name: parts[0],
                            type: parts[1],
                            nullable: !trimmed.includes('NOT NULL')
                        });
                    }
                }
            });
        }
        return columns;
    }

    analyzeMigrations() {
        try {
            const migrationsDir = path.join(__dirname, 'migrations');
            const files = fs.readdirSync(migrationsDir).sort();
            
            files.forEach(file => {
                if (file.endsWith('.js')) {
                    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
                    this.extractTableInfo(content, file);
                }
            });
        } catch (error) {
            console.error('Error analyzing migrations:', error.message);
        }
    }

    generateReport() {
        this.analyzeMigrations();

        const report = {
            summary: {
                totalTables: Object.keys(this.analysis.tables).length,
                tableNames: Object.keys(this.analysis.tables)
            },
            tables: this.analysis.tables
        };

        return JSON.stringify(report, null, 2);
    }
}

console.log('🔍 PARKARLABS - JavaScript Database Analysis');
console.log('=============================================');

const analyzer = new DatabaseAnalyzer();
const report = analyzer.generateReport();

console.log(report);

fs.writeFileSync('js_analysis.json', report);
console.log('\n✅ Analysis saved to js_analysis.json');
