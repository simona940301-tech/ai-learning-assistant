/**
 * Environment Variables Validation
 * 
 * Validates all required environment variables at startup.
 * Throws descriptive errors if any are missing.
 */

interface EnvVar {
  name: string
  required: boolean
  description: string
  validate?: (value: string) => boolean | string
}

const REQUIRED_ENV_VARS: EnvVar[] = [
  {
    name: 'NEXT_PUBLIC_SUPABASE_URL',
    required: true,
    description: 'Supabase project URL',
    validate: (value) => {
      if (!value.startsWith('https://')) {
        return 'Must start with https://'
      }
      return true
    },
  },
  {
    name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    required: true,
    description: 'Supabase anonymous key',
    validate: (value) => {
      if (value.length < 20) {
        return 'Key seems too short'
      }
      return true
    },
  },
  {
    name: 'SUPABASE_SERVICE_ROLE_KEY',
    required: true,
    description: 'Supabase service role key (server-side only)',
    validate: (value) => {
      if (value.length < 20) {
        return 'Key seems too short'
      }
      return true
    },
  },
  {
    name: 'BACKPACK_DEV_USER_ID',
    required: process.env.NODE_ENV === 'development',
    description: 'Development user ID for Backpack (UUID format)',
    validate: (value) => {
      const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/
      if (!uuidRegex.test(value)) {
        return 'Must be a valid UUID format'
      }
      return true
    },
  },
  {
    name: 'OPENAI_API_KEY',
    required: true,
    description: 'OpenAI API key',
    validate: (value) => {
      if (!value.startsWith('sk-')) {
        return 'Must start with sk-'
      }
      return true
    },
  },
]

export interface ValidationResult {
  valid: boolean
  errors: Array<{ name: string; message: string }>
  warnings: Array<{ name: string; message: string }>
}

/**
 * Validate all required environment variables
 */
export function validateEnvironment(): ValidationResult {
  const errors: Array<{ name: string; message: string }> = []
  const warnings: Array<{ name: string; message: string }> = []

  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar.name]

    if (!value) {
      if (envVar.required) {
        errors.push({
          name: envVar.name,
          message: `${envVar.name} is required: ${envVar.description}`,
        })
      } else {
        warnings.push({
          name: envVar.name,
          message: `${envVar.name} is not set (optional): ${envVar.description}`,
        })
      }
      continue
    }

    // Run validation if provided
    if (envVar.validate) {
      const validationResult = envVar.validate(value)
      if (validationResult !== true) {
        const message =
          typeof validationResult === 'string'
            ? validationResult
            : `Invalid format for ${envVar.name}`
        errors.push({
          name: envVar.name,
          message: `${envVar.name} validation failed: ${message}`,
        })
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Validate and log results
 */
export function validateAndLog(): ValidationResult {
  const result = validateEnvironment()

  if (result.errors.length > 0) {
    console.error('╔═══════════════════════════════════════════════════════╗')
    console.error('║  ❌ Environment Variables Validation Failed            ║')
    console.error('╚═══════════════════════════════════════════════════════╝')
    console.error('')
    console.error('Missing or invalid environment variables:')
    result.errors.forEach((error) => {
      console.error(`  ❌ ${error.message}`)
    })
    console.error('')
    console.error('Please check your .env.local file and ensure all required variables are set.')
    console.error('')
  } else if (result.warnings.length > 0) {
    console.warn('╔═══════════════════════════════════════════════════════╗')
    console.warn('║  ⚠️  Environment Variables Validation Warnings        ║')
    console.warn('╚═══════════════════════════════════════════════════════╝')
    console.warn('')
    result.warnings.forEach((warning) => {
      console.warn(`  ⚠️  ${warning.message}`)
    })
    console.warn('')
  } else {
    console.log('╔═══════════════════════════════════════════════════════╗')
    console.log('║  ✅ Environment Variables Validation Passed           ║')
    console.log('╚═══════════════════════════════════════════════════════╝')
  }

  return result
}

/**
 * Validate and throw if invalid (for use in API routes)
 */
export function validateOrThrow(): void {
  const result = validateEnvironment()
  if (!result.valid) {
    const errorMessages = result.errors.map((e) => e.message).join('\n')
    throw new Error(`Environment validation failed:\n${errorMessages}`)
  }
}

