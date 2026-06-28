CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  account_status TEXT NOT NULL DEFAULT 'Active',
  contact_number TEXT DEFAULT '',
  address TEXT DEFAULT '',
  date_of_birth TEXT DEFAULT '',
  online_status TEXT DEFAULT 'online',
  avatar TEXT DEFAULT '',
  terms_agreement_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  terms_accepted_at TIMESTAMPTZ,
  terms_version TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$ BEGIN
  -- Normalize the legacy users table created by the earlier migration.
  -- That table used user_id UUID as the primary key, while the backend now
  -- expects id UUID plus a separate user_id public identifier.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE users RENAME COLUMN user_id TO id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'full_name'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE users RENAME COLUMN full_name TO name;
  END IF;

  ALTER TABLE users ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
  UPDATE users SET id = gen_random_uuid() WHERE id IS NULL;
  ALTER TABLE users ALTER COLUMN id SET NOT NULL;
  ALTER TABLE users ALTER COLUMN id SET DEFAULT gen_random_uuid();

  ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id TEXT;
  UPDATE users
  SET user_id = UPPER(LEFT(role::TEXT, 3)) || '-' || SUBSTRING(MD5(email), 1, 8)
  WHERE user_id IS NULL OR user_id = '';
  ALTER TABLE users ALTER COLUMN user_id SET NOT NULL;

  ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
  UPDATE users SET name = email WHERE name IS NULL OR name = '';
  ALTER TABLE users ALTER COLUMN name SET NOT NULL;

  ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
  UPDATE users SET password_hash = '' WHERE password_hash IS NULL;
  ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;

  ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'Active';
  UPDATE users SET account_status = 'Active' WHERE account_status IS NULL;
  ALTER TABLE users ALTER COLUMN account_status SET NOT NULL;
  ALTER TABLE users ALTER COLUMN account_status SET DEFAULT 'Active';

  ALTER TABLE users ADD COLUMN IF NOT EXISTS contact_number TEXT DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth TEXT DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS online_status TEXT DEFAULT 'online';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_agreement_accepted BOOLEAN DEFAULT FALSE;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;
  ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version TEXT DEFAULT '';
  ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

  UPDATE users
  SET
    contact_number = COALESCE(contact_number, ''),
    address = COALESCE(address, ''),
    date_of_birth = COALESCE(date_of_birth, ''),
    online_status = COALESCE(online_status, 'online'),
    avatar = COALESCE(avatar, ''),
    terms_agreement_accepted = COALESCE(terms_agreement_accepted, FALSE),
    terms_version = COALESCE(terms_version, ''),
    created_at = COALESCE(created_at, NOW()),
    updated_at = COALESCE(updated_at, NOW());

  ALTER TABLE users ALTER COLUMN email SET NOT NULL;
  ALTER TABLE users ALTER COLUMN role SET NOT NULL;
  ALTER TABLE users ALTER COLUMN terms_agreement_accepted SET NOT NULL;
  ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
  ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;

  ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND contype = 'p'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'users'::regclass
      AND conname = 'users_user_id_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_user_id_key UNIQUE (user_id);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS students (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  student_number TEXT UNIQUE,
  course TEXT,
  year_level TEXT,
  section TEXT,
  program_status TEXT DEFAULT 'Regular',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teachers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  department TEXT,
  specialization TEXT,
  assigned_courses TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  admin_id TEXT UNIQUE,
  system_role TEXT,
  access_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_terms_agreements (
  agreement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  accepted BOOLEAN NOT NULL DEFAULT TRUE,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  version TEXT NOT NULL,
  user_role user_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_terms_user_version ON user_terms_agreements (user_id, version);

CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS modules (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  lessons_count INTEGER NOT NULL DEFAULT 0,
  last_updated TEXT DEFAULT '',
  category TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS lesson_items (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  module_id TEXT REFERENCES modules(id) ON DELETE SET NULL,
  module_title TEXT DEFAULT '',
  type TEXT NOT NULL,
  difficulty TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS video_tutorials (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  duration TEXT DEFAULT '',
  sequence INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'locked',
  video_url TEXT NOT NULL,
  description TEXT DEFAULT '',
  concepts JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT DEFAULT '',
  topic TEXT DEFAULT '',
  difficulty TEXT DEFAULT '',
  language TEXT DEFAULT '',
  module TEXT DEFAULT '',
  category TEXT DEFAULT '',
  is_archived BOOLEAN NOT NULL DEFAULT FALSE,
  unlocked_assessment_id TEXT,
  views INTEGER NOT NULL DEFAULT 0,
  avg_watch_time INTEGER NOT NULL DEFAULT 0,
  completed_students JSONB NOT NULL DEFAULT '[]'::jsonb,
  in_progress_students JSONB NOT NULL DEFAULT '[]'::jsonb,
  not_started_students JSONB NOT NULL DEFAULT '[]'::jsonb,
  progress_percent NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_video_course ON video_tutorials (course_id);
CREATE INDEX IF NOT EXISTS idx_video_status ON video_tutorials (status);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  topic_name TEXT DEFAULT '',
  questions_count INTEGER NOT NULL DEFAULT 0,
  time_limit_minutes INTEGER NOT NULL DEFAULT 0,
  difficulty TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS assessment_questions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT REFERENCES assessments(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  code_snippet TEXT DEFAULT '',
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_option_id TEXT NOT NULL,
  difficulty TEXT DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_assessment ON assessment_questions (assessment_id);

CREATE TABLE IF NOT EXISTS quiz_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id TEXT REFERENCES assessments(id) ON DELETE SET NULL,
  score INTEGER NOT NULL DEFAULT 0,
  max_score INTEGER NOT NULL DEFAULT 0,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT REFERENCES video_tutorials(id) ON DELETE CASCADE,
  last_position NUMERIC NOT NULL DEFAULT 0,
  completion_percentage NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  date_completed TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_progress_student ON student_progress (student_user_id);

CREATE TABLE IF NOT EXISTS learning_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  resource_type TEXT DEFAULT '',
  resource_id TEXT DEFAULT '',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ DECLARE
  table_name TEXT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'users',
    'students',
    'teachers',
    'admins',
    'courses',
    'modules',
    'lesson_items',
    'video_tutorials',
    'assessments',
    'assessment_questions',
    'student_progress'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I', table_name, table_name);
    EXECUTE format('CREATE TRIGGER trg_%I_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION set_updated_at()', table_name, table_name);
  END LOOP;
END $$;
