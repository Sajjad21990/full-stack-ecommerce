import { config } from 'dotenv'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

const log = (message: string) => {
  console.log(`🔍 ${message}`)
}

const logSuccess = (message: string) => {
  console.log(`✅ ${message}`)
}

const logError = (message: string) => {
  console.error(`❌ ${message}`)
}

const logWarning = (message: string) => {
  console.warn(`⚠️  ${message}`)
}

// Required environment variables for the application
const REQUIRED_ENV_VARS = [
  {
    name: 'DATABASE_URL',
    description: 'PostgreSQL database connection string',
    example: 'postgres://user:password@localhost:5432/dbname',
    required: true
  },
  {
    name: 'NEXTAUTH_URL',
    description: 'Next.js application URL',
    example: 'http://localhost:3000',
    required: true
  },
  {
    name: 'NEXTAUTH_SECRET',
    description: 'NextAuth.js secret for session encryption',
    example: 'your-secret-key-here',
    required: true
  }
]

// Optional environment variables with warnings
const OPTIONAL_ENV_VARS = [
  {
    name: 'EMAIL_SERVER_HOST',
    description: 'SMTP server host for email OTP',
    example: 'localhost',
    required: false
  },
  {
    name: 'EMAIL_SERVER_PORT',
    description: 'SMTP server port',
    example: '1025',
    required: false
  },
  {
    name: 'REDIS_URL',
    description: 'Redis connection string for caching',
    example: 'redis://localhost:6379',
    required: false
  },
  {
    name: 'MEILISEARCH_URL',
    description: 'Meilisearch server URL for search',
    example: 'http://localhost:7700',
    required: false
  }
]

// Production-specific environment variables
const PRODUCTION_ENV_VARS = [
  {
    name: 'RAZORPAY_KEY_ID',
    description: 'Razorpay payment gateway key ID',
    example: 'rzp_test_xxxxxxxxxx',
    required: false
  },
  {
    name: 'RESEND_API_KEY',
    description: 'Resend API key for production emails',
    example: 're_xxxxxxxxxx',
    required: false
  },
  {
    name: 'FIREBASE_PROJECT_ID',
    description: 'Firebase project ID for file storage',
    example: 'your-project-id',
    required: false
  }
]

function validateRequiredEnvVars(): { valid: boolean; missing: string[] } {
  log('Validating required environment variables...')
  
  const missing: string[] = []
  
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name]
    
    if (!value || value.trim() === '') {
      missing.push(envVar.name)
      logError(`Missing required environment variable: ${envVar.name}`)
      logError(`  Description: ${envVar.description}`)
      logError(`  Example: ${envVar.example}`)
    } else {
      // Validate specific formats
      if (envVar.name === 'DATABASE_URL' && !value.startsWith('postgres://')) {
        logError(`Invalid DATABASE_URL format. Must start with postgres://`)
        missing.push(envVar.name)
      } else if (envVar.name === 'NEXTAUTH_URL' && !value.startsWith('http')) {
        logError(`Invalid NEXTAUTH_URL format. Must start with http:// or https://`)
        missing.push(envVar.name)
      } else {
        logSuccess(`✓ ${envVar.name} is set`)
      }
    }
  }
  
  return { valid: missing.length === 0, missing }
}

function validateOptionalEnvVars(): { warnings: string[] } {
  log('Checking optional environment variables...')
  
  const warnings: string[] = []
  
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar.name]
    
    if (!value || value.trim() === '') {
      warnings.push(envVar.name)
      logWarning(`Optional variable not set: ${envVar.name}`)
      logWarning(`  Description: ${envVar.description}`)
      logWarning(`  Example: ${envVar.example}`)
    } else {
      logSuccess(`✓ ${envVar.name} is set`)
    }
  }
  
  return { warnings }
}

function checkProductionEnvVars(): { productionReady: boolean } {
  const isProduction = process.env.NODE_ENV === 'production'
  
  if (!isProduction) {
    log('Development environment detected, skipping production checks')
    return { productionReady: true }
  }
  
  log('Validating production environment variables...')
  
  let productionReady = true
  
  for (const envVar of PRODUCTION_ENV_VARS) {
    const value = process.env[envVar.name]
    
    if (!value || value.trim() === '') {
      logWarning(`Production variable not set: ${envVar.name}`)
      logWarning(`  Description: ${envVar.description}`)
      productionReady = false
    } else {
      logSuccess(`✓ ${envVar.name} is set`)
    }
  }
  
  return { productionReady }
}

function validateDatabaseUrl(): boolean {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) return false
  
  try {
    const url = new URL(dbUrl)
    
    if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
      logError('DATABASE_URL must use postgres:// or postgresql:// protocol')
      return false
    }
    
    if (!url.hostname) {
      logError('DATABASE_URL missing hostname')
      return false
    }
    
    if (!url.pathname || url.pathname === '/') {
      logError('DATABASE_URL missing database name')
      return false
    }
    
    // Check for localhost in production
    if (process.env.NODE_ENV === 'production' && url.hostname === 'localhost') {
      logWarning('Using localhost database in production environment')
    }
    
    logSuccess('DATABASE_URL format is valid')
    return true
  } catch (error) {
    logError(`Invalid DATABASE_URL format: ${error}`)
    return false
  }
}

function checkEnvFileExistence(): void {
  const fs = require('fs')
  const path = require('path')
  
  const envFiles = ['.env', '.env.local', '.env.development', '.env.production']
  
  log('Checking for environment files...')
  
  for (const file of envFiles) {
    const filePath = path.resolve(process.cwd(), file)
    if (fs.existsSync(filePath)) {
      logSuccess(`Found: ${file}`)
    }
  }
  
  // Check if .env is in gitignore
  const gitignorePath = path.resolve(process.cwd(), '.gitignore')
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8')
    if (!gitignoreContent.includes('.env.local')) {
      logWarning('.env.local should be added to .gitignore')
    }
  }
}

function generateEnvTemplate(): void {
  log('Generating .env.example template...')
  
  let template = '# Environment Variables Template\n'
  template += '# Copy this file to .env and fill in your values\n\n'
  
  template += '# Required Variables\n'
  for (const envVar of REQUIRED_ENV_VARS) {
    template += `# ${envVar.description}\n`
    template += `${envVar.name}=${envVar.example}\n\n`
  }
  
  template += '# Optional Variables\n'
  for (const envVar of OPTIONAL_ENV_VARS) {
    template += `# ${envVar.description}\n`
    template += `# ${envVar.name}=${envVar.example}\n\n`
  }
  
  template += '# Production Variables\n'
  for (const envVar of PRODUCTION_ENV_VARS) {
    template += `# ${envVar.description}\n`
    template += `# ${envVar.name}=${envVar.example}\n\n`
  }
  
  const fs = require('fs')
  fs.writeFileSync('.env.example', template)
  logSuccess('Created .env.example template')
}

async function main() {
  try {
    log('Starting environment validation...\n')
    
    checkEnvFileExistence()
    
    const { valid, missing } = validateRequiredEnvVars()
    const { warnings } = validateOptionalEnvVars()
    const { productionReady } = checkProductionEnvVars()
    
    const dbUrlValid = validateDatabaseUrl()
    
    console.log('\n📊 ENVIRONMENT VALIDATION REPORT')
    console.log('===================================')
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`Required Variables: ${valid ? '✅ PASS' : '❌ FAIL'}`)
    console.log(`Database URL: ${dbUrlValid ? '✅ VALID' : '❌ INVALID'}`)
    console.log(`Optional Variables: ${warnings.length} warnings`)
    console.log(`Production Ready: ${productionReady ? '✅ YES' : '⚠️  NO'}`)
    
    if (!valid) {
      logError('\n💥 Environment validation FAILED!')
      logError(`Missing required variables: ${missing.join(', ')}`)
      logError('Please set the missing environment variables before proceeding')
      
      generateEnvTemplate()
      logWarning('Check .env.example for required variable format')
      
      process.exit(1)
    }
    
    if (warnings.length > 0) {
      logWarning('\n⚠️  Some optional features may not work properly')
      logWarning('Set the missing optional variables for full functionality')
    }
    
    if (!productionReady && process.env.NODE_ENV === 'production') {
      logWarning('\n⚠️  Production environment is not fully configured')
      logWarning('Set production variables for payment, email, and storage features')
    }
    
    logSuccess('\n🎉 Environment validation PASSED!')
    logSuccess('Your application is properly configured')
    
  } catch (error) {
    logError(`Environment validation failed: ${error}`)
    process.exit(1)
  } finally {
    process.exit(0)
  }
}

main()