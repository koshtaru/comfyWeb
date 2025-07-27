#!/usr/bin/env node

/**
 * Custom Dependency Analyzer
 * Finds circular dependencies and documents module structure
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class DependencyAnalyzer {
  constructor(srcDir) {
    this.srcDir = srcDir
    this.dependencies = new Map() // file -> Set of dependencies
    this.fileTypes = new Map() // file -> type (component, service, util, etc.)
    this.circularDeps = []
    this.visited = new Set()
    this.visiting = new Set()
  }

  // Get all TypeScript files
  getAllFiles(dir, extension = /\.(ts|tsx)$/) {
    const files = []
    
    const scan = (currentDir) => {
      const items = fs.readdirSync(currentDir)
      
      for (const item of items) {
        const fullPath = path.join(currentDir, item)
        const stat = fs.statSync(fullPath)
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          scan(fullPath)
        } else if (stat.isFile() && extension.test(item)) {
          files.push(fullPath)
        }
      }
    }
    
    scan(dir)
    return files
  }

  // Extract imports from a file
  extractImports(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      const imports = new Set()
      
      // Match various import patterns
      const importPatterns = [
        /import\s+.*?\s+from\s+['"]([^'"]+)['"]/g,
        /import\s+['"]([^'"]+)['"]/g,
        /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g
      ]
      
      importPatterns.forEach(pattern => {
        let match
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1]
          
          // Only track relative imports (internal dependencies)
          if (importPath.startsWith('./') || importPath.startsWith('../') || importPath.startsWith('@/')) {
            const resolvedPath = this.resolveImportPath(filePath, importPath)
            if (resolvedPath) {
              imports.add(resolvedPath)
            }
          }
        }
      })
      
      return imports
    } catch (error) {
      console.warn(`Could not read file ${filePath}:`, error.message)
      return new Set()
    }
  }

  // Resolve import path to actual file
  resolveImportPath(fromFile, importPath) {
    try {
      let resolvedPath
      
      if (importPath.startsWith('@/')) {
        // Handle @ alias
        resolvedPath = path.join(this.srcDir, importPath.slice(2))
      } else {
        // Handle relative imports
        const fromDir = path.dirname(fromFile)
        resolvedPath = path.resolve(fromDir, importPath)
      }
      
      // Try different extensions
      const extensions = ['', '.ts', '.tsx', '/index.ts', '/index.tsx']
      
      for (const ext of extensions) {
        const fullPath = resolvedPath + ext
        if (fs.existsSync(fullPath)) {
          return fullPath
        }
      }
      
      return null
    } catch (error) {
      return null
    }
  }

  // Classify file type based on path and content
  classifyFile(filePath) {
    const relativePath = path.relative(this.srcDir, filePath)
    
    if (relativePath.includes('/components/')) return 'component'
    if (relativePath.includes('/services/')) return 'service'
    if (relativePath.includes('/utils/')) return 'util'
    if (relativePath.includes('/types/')) return 'type'
    if (relativePath.includes('/store/')) return 'store'
    if (relativePath.includes('/hooks/')) return 'hook'
    if (relativePath.includes('/contexts/')) return 'context'
    if (relativePath.includes('/pages/')) return 'page'
    
    return 'other'
  }

  // Find circular dependencies using DFS
  findCircularDependencies(file, path = []) {
    if (this.visiting.has(file)) {
      // Found a cycle
      const cycleStart = path.indexOf(file)
      const cycle = path.slice(cycleStart).concat([file])
      this.circularDeps.push(cycle)
      return
    }
    
    if (this.visited.has(file)) {
      return // Already processed
    }
    
    this.visiting.add(file)
    const dependencies = this.dependencies.get(file) || new Set()
    
    for (const dep of dependencies) {
      this.findCircularDependencies(dep, [...path, file])
    }
    
    this.visiting.delete(file)
    this.visited.add(file)
  }

  // Analyze all dependencies
  analyze() {
    console.log('🔍 Analyzing module dependencies...\n')
    
    // Get all files
    const files = this.getAllFiles(this.srcDir)
    console.log(`📁 Found ${files.length} TypeScript files\n`)
    
    // Extract dependencies for each file
    files.forEach(file => {
      const imports = this.extractImports(file)
      const fileType = this.classifyFile(file)
      
      this.dependencies.set(file, imports)
      this.fileTypes.set(file, fileType)
    })
    
    // Find circular dependencies
    this.visited.clear()
    this.visiting.clear()
    this.circularDeps = []
    
    files.forEach(file => {
      if (!this.visited.has(file)) {
        this.findCircularDependencies(file)
      }
    })
    
    return this.generateReport()
  }

  // Generate analysis report
  generateReport() {
    const report = {
      totalFiles: this.dependencies.size,
      circularDependencies: this.circularDeps.length,
      filesByType: {},
      dependencyViolations: [],
      circularDeps: this.circularDeps.map(cycle => 
        cycle.map(file => path.relative(this.srcDir, file))
      )
    }
    
    // Count files by type
    for (const [file, type] of this.fileTypes) {
      report.filesByType[type] = (report.filesByType[type] || 0) + 1
    }
    
    // Check for architectural violations
    for (const [file, deps] of this.dependencies) {
      const fileType = this.fileTypes.get(file)
      
      for (const dep of deps) {
        const depType = this.fileTypes.get(dep)
        
        // Define allowed dependencies
        const violations = this.checkArchitecturalRules(fileType, depType, file, dep)
        report.dependencyViolations.push(...violations)
      }
    }
    
    return report
  }

  // Check architectural rules
  checkArchitecturalRules(fromType, toType, fromFile, toFile) {
    const violations = []
    const fromPath = path.relative(this.srcDir, fromFile)
    const toPath = path.relative(this.srcDir, toFile)
    
    // Rules:
    // - Components should not import other components (except through index files)
    // - Utils should not import components
    // - Types should not import anything except other types
    
    if (fromType === 'component' && toType === 'component' && !toPath.includes('index')) {
      violations.push({
        type: 'component-to-component',
        from: fromPath,
        to: toPath,
        message: 'Component should not directly import another component'
      })
    }
    
    if (fromType === 'util' && ['component', 'page', 'store'].includes(toType)) {
      violations.push({
        type: 'util-to-ui',
        from: fromPath,
        to: toPath,
        message: 'Utility should not import UI components or stores'
      })
    }
    
    if (fromType === 'type' && !['type'].includes(toType)) {
      violations.push({
        type: 'type-dependency',
        from: fromPath,
        to: toPath,
        message: 'Type files should only import other types'
      })
    }
    
    return violations
  }

  // Print colored report
  printReport(report) {
    console.log('🔍 DEPENDENCY ANALYSIS REPORT')
    console.log('═'.repeat(50))
    console.log()
    
    // Summary
    console.log('📊 SUMMARY:')
    console.log(`   Total Files: ${report.totalFiles}`)
    console.log(`   Circular Dependencies: ${report.circularDependencies}`)
    console.log(`   Architectural Violations: ${report.dependencyViolations.length}`)
    console.log()
    
    // Files by type
    console.log('📁 FILES BY TYPE:')
    Object.entries(report.filesByType)
      .sort(([,a], [,b]) => b - a)
      .forEach(([type, count]) => {
        console.log(`   ${type}: ${count}`)
      })
    console.log()
    
    // Circular dependencies
    if (report.circularDeps.length > 0) {
      console.log('🔄 CIRCULAR DEPENDENCIES:')
      report.circularDeps.forEach((cycle, i) => {
        console.log(`   ${i + 1}. ${cycle.join(' → ')}`)
      })
      console.log()
    } else {
      console.log('✅ NO CIRCULAR DEPENDENCIES FOUND!')
      console.log()
    }
    
    // Architectural violations
    if (report.dependencyViolations.length > 0) {
      console.log('⚠️  ARCHITECTURAL VIOLATIONS:')
      const grouped = {}
      report.dependencyViolations.forEach(violation => {
        if (!grouped[violation.type]) grouped[violation.type] = []
        grouped[violation.type].push(violation)
      })
      
      Object.entries(grouped).forEach(([type, violations]) => {
        console.log(`   ${type.toUpperCase()}:`)
        violations.slice(0, 5).forEach(v => {
          console.log(`     ${v.from} → ${v.to}`)
          console.log(`     └─ ${v.message}`)
        })
        if (violations.length > 5) {
          console.log(`     ... and ${violations.length - 5} more`)
        }
        console.log()
      })
    } else {
      console.log('✅ NO ARCHITECTURAL VIOLATIONS FOUND!')
      console.log()
    }
    
    return report
  }
}

// Run analysis
const srcDir = path.join(process.cwd(), 'src')
const analyzer = new DependencyAnalyzer(srcDir)

try {
  const report = analyzer.analyze()
  analyzer.printReport(report)
  
  // Save detailed report
  const reportPath = path.join(process.cwd(), 'dependency-analysis-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`📄 Detailed report saved to: ${reportPath}`)
  
} catch (error) {
  console.error('❌ Analysis failed:', error.message)
  process.exit(1)
}