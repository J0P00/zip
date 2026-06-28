import dotenv from 'dotenv';

dotenv.config();

/**
 * Environment Configuration and Validation
 * Ensures all required environment variables are set and valid
 */

// ============================================================================
// ENVIRONMENT VARIABLES
// ============================================================================

export const NODE_ENV = process.env.NODE_ENV || 'development';
export const API_PORT = parseInt(process.env.PORT || process.env.API_PORT || '5000', 10);
export const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000,https://zip-pi-gules.vercel.app';

// Supabase configuration
export const SUPABASE_URL = process.env.SUPABASE_URL || '';
export const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || '';

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Check if a credential looks like a placeholder (not real)
 */
function isPlaceholder(value: string): boolean {
  if (!value) return true;
  
  const placeholderPatterns = [
    'your-project',
    'your-anon-key',
    'your-service-role-key',
    'my_',
    'example',
    'placeholder'
  ];
  
  return placeholderPatterns.some(pattern => value.toLowerCase().includes(pattern));
}

/**
 * Validate Supabase configuration
 * Returns { valid: boolean, message: string }
 */
export function validateSupabaseConfig(): { valid: boolean; message: string } {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return {
      valid: false,
      message: 'Missing Supabase configuration. SUPABASE_URL and SUPABASE_SERVICE_KEY are required.'
    };
  }

  if (isPlaceholder(SUPABASE_URL) || isPlaceholder(SUPABASE_SERVICE_KEY)) {
    return {
      valid: false,
      message: `Supabase credentials appear to be placeholder values.
      
Please configure real Supabase credentials:
1. Create a Supabase project at https://supabase.com
2. Get your credentials from the project settings
3. Update your .env file with:
   SUPABASE_URL=https://your-actual-project.supabase.co
   SUPABASE_ANON_KEY=your-actual-anon-key
   SUPABASE_SERVICE_KEY=your-actual-service-role-key

For development without Supabase, set:
   SKIP_SUPABASE=true (will use mock data)`
    };
  }

  return { valid: true, message: 'Supabase configuration is valid' };
}

/**
 * Validate all environment configuration
 */
export function validateAllConfig(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check Supabase if not skipped
  if (process.env.SKIP_SUPABASE !== 'true') {
    const supabaseValidation = validateSupabaseConfig();
    if (!supabaseValidation.valid) {
      errors.push(supabaseValidation.message);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Log environment configuration (sanitized)
 */
export function logConfig(): void {
  console.log('='.repeat(70));
  console.log('📋 Environment Configuration');
  console.log('='.repeat(70));
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🔌 API Port: ${API_PORT}`);
  console.log(`🔐 CORS Origin: ${CORS_ORIGIN}`);
  
  if (process.env.SKIP_SUPABASE === 'true') {
    console.log('🔄 Mode: Development (Supabase skipped, using mock data)');
  } else if (SUPABASE_URL && !isPlaceholder(SUPABASE_URL)) {
    console.log('🔄 Mode: Production (Supabase enabled)');
    console.log(`📊 Supabase Project: ${SUPABASE_URL.split('//')[1]?.split('.')[0] || 'unknown'}`);
  } else {
    console.log('🔄 Mode: Development (Supabase not configured)');
  }
  
  console.log('='.repeat(70));
}
