import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase configuration in environment variables');
  process.exit(1);
}

// Initialize Supabase client with service role key (for server-side operations)
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Initialize Supabase client with anon key (for client operations)
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey || '');

/**
 * Initialize database schema and tables
 * This should be run once during first deployment
 */
export async function initializeDatabase() {
  try {
    // Create users table if it doesn't exist
    const { error: usersError } = await supabase.rpc('exec', {
      sql: `
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          email VARCHAR UNIQUE NOT NULL,
          password_hash VARCHAR NOT NULL,
          name VARCHAR NOT NULL,
          role VARCHAR NOT NULL CHECK (role IN ('student', 'teacher', 'admin')),
          user_id VARCHAR UNIQUE NOT NULL,
          registration_date TIMESTAMP DEFAULT NOW(),
          account_status VARCHAR DEFAULT 'Active',
          
          -- Student fields
          student_number VARCHAR,
          course VARCHAR,
          year_level VARCHAR,
          section VARCHAR,
          program_status VARCHAR,
          
          -- Teacher fields
          employee_id VARCHAR,
          department VARCHAR,
          specialization VARCHAR,
          assigned_courses VARCHAR,
          
          -- Admin fields
          admin_id VARCHAR,
          system_role VARCHAR,
          access_level VARCHAR,
          
          -- Common fields
          contact_number VARCHAR,
          address VARCHAR,
          date_of_birth VARCHAR,
          online_status VARCHAR DEFAULT 'offline',
          avatar VARCHAR,
          
          -- Terms
          terms_agreement_accepted BOOLEAN DEFAULT FALSE,
          terms_accepted_at TIMESTAMP,
          terms_version VARCHAR,
          
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS video_lessons (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          title VARCHAR NOT NULL,
          description TEXT,
          instructor VARCHAR NOT NULL,
          duration INTEGER,
          video_url VARCHAR NOT NULL,
          thumbnail_url VARCHAR,
          lesson_number INTEGER,
          curriculum_id VARCHAR,
          created_by UUID REFERENCES users(id),
          is_available BOOLEAN DEFAULT TRUE,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS user_sessions (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id),
          session_token VARCHAR UNIQUE NOT NULL,
          user_agent VARCHAR,
          ip_address VARCHAR,
          created_at TIMESTAMP DEFAULT NOW(),
          expires_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
          last_activity TIMESTAMP DEFAULT NOW()
        );
        
        CREATE TABLE IF NOT EXISTS audit_logs (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID REFERENCES users(id),
          action VARCHAR NOT NULL,
          resource_type VARCHAR,
          resource_id VARCHAR,
          timestamp TIMESTAMP DEFAULT NOW(),
          details JSONB
        );
        
        -- Create indexes for performance
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token);
        CREATE INDEX IF NOT EXISTS idx_videos_created_by ON video_lessons(created_by);
        CREATE INDEX IF NOT EXISTS idx_videos_curriculum ON video_lessons(curriculum_id);
        CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
      `
    });

    if (usersError && !usersError.message.includes('already exists')) {
      console.error('Error initializing database:', usersError);
    } else {
      console.log('Database schema initialized successfully');
    }
  } catch (error) {
    console.error('Unexpected error during database initialization:', error);
  }
}

/**
 * Log audit trail for important actions
 */
export async function logAudit(userId: string | null, action: string, resourceType: string, resourceId: string, details?: any) {
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
