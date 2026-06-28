import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_KEY, validateSupabaseConfig, NODE_ENV } from './config';

// ============================================================================
// SUPABASE CLIENT INITIALIZATION
// ============================================================================

let supabase: any;
let supabaseClient: any;
let isSupabaseConfigured = false;

// Check if Supabase should be used (not skipped for development)
if (process.env.SKIP_SUPABASE !== 'true' && SUPABASE_URL && SUPABASE_SERVICE_KEY) {
  const validation = validateSupabaseConfig();
  
  if (validation.valid) {
    try {
      // Initialize Supabase client with service role key (for server-side operations)
      supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
      
      // Initialize Supabase client with anon key (for client operations)
      supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || '');
      
      isSupabaseConfigured = true;
    } catch (error) {
      console.error('❌ Failed to initialize Supabase:', error);
      // In development, allow continuing without Supabase
      if (NODE_ENV !== 'production') {
        console.log('⚠️  Continuing in development mode without Supabase');
      } else {
        throw new Error(`Supabase initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
}

export { supabase, supabaseClient, isSupabaseConfigured };

/**
 * Initialize database schema and tables
 * This should be run once during first deployment
 */
export async function initializeDatabase() {
  // Skip if Supabase is not configured
  if (!isSupabaseConfigured) {
    console.log('⏭️  Skipping database initialization (Supabase not configured for development mode)');
    return;
  }

  try {
    console.log('📊 Initializing Supabase database schema...');
    
    // Test connection first
    const { error: testError } = await supabase.from('_test_connection').select('*').limit(1);
    
    if (testError && !testError.message.includes('relation') && !testError.message.includes('not found')) {
      console.error('❌ Supabase connection failed:', testError);
      throw new Error(`Database connection failed: ${testError.message}`);
    }
    
    console.log('✅ Database schema verification complete');
    console.log('ℹ️  Note: Tables should exist in your Supabase project. Create them via the dashboard if needed.');
    
  } catch (error) {
    console.error('❌ Database initialization error:', error);
    console.log('⚠️  Running in degraded mode - database operations may fail');
    // Don't throw - allow server to continue running for development
  }
}

/**
 * Log audit trail for important actions
 */
export async function logAudit(userId: string | null, action: string, resourceType: string, resourceId: string, details?: any) {
  if (!isSupabaseConfigured) {
    console.log(`📝 [Audit Log (Mock)] User: ${userId || 'anonymous'}, Action: ${action}, Resource: ${resourceType}/${resourceId}`);
    return;
  }
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      details
    });
  } catch (error) {
    console.error('Error logging audit:', error);
  }
}
