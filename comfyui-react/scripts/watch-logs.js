#!/usr/bin/env node

/**
 * Simple log watcher script
 * Usage: node scripts/watch-logs.js
 */

const fs = require('fs')
const path = require('path')

const logFile = path.join(process.cwd(), 'logs', 'app.log')
const logDir = path.join(process.cwd(), 'logs')

// Ensure logs directory exists
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true })
}

// Create log file if it doesn't exist
if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, '# ComfyUI React Application Logs\n\n')
}

console.log('🔍 Watching logs at:', logFile)
console.log('📝 Use Ctrl+C to stop watching\n')

// Watch for changes and display new content
let lastSize = fs.statSync(logFile).size

fs.watchFile(logFile, { interval: 500 }, (curr, prev) => {
  if (curr.size > lastSize) {
    const stream = fs.createReadStream(logFile, {
      start: lastSize,
      end: curr.size
    })
    
    stream.on('data', (chunk) => {
      process.stdout.write(chunk.toString())
    })
    
    lastSize = curr.size
  }
})

// Display existing content
if (lastSize > 0) {
  console.log('📄 Existing logs:\n')
  const existingContent = fs.readFileSync(logFile, 'utf8')
  const lines = existingContent.split('\n').slice(-20) // Last 20 lines
  console.log(lines.join('\n'))
  console.log('\n🔄 Watching for new logs...\n')
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n✨ Log watching stopped')
  process.exit(0)
})