-- OOP Hub PostgreSQL/Supabase schema
-- This file is intentionally idempotent. It can be run against a fresh
-- database or an older Render-era database without dropping existing tables.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'user_id'
      AND data_type = 'uuid'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'id'
  ) THEN
    ALTER TABLE users RENAME COLUMN user_id TO id;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'full_name'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'name'
  ) THEN
    ALTER TABLE users RENAME COLUMN full_name TO name;
  END IF;
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

ALTER TABLE users ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid();
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'student';
ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'Active';
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
  id = COALESCE(id, gen_random_uuid()),
  user_id = COALESCE(NULLIF(user_id, ''), UPPER(LEFT(role::TEXT, 3)) || '-' || SUBSTRING(MD5(COALESCE(email, gen_random_uuid()::text)), 1, 8)),
  name = COALESCE(NULLIF(name, ''), email, 'Unnamed User'),
  email = COALESCE(NULLIF(email, ''), LOWER(gen_random_uuid()::text || '@migrated.local')),
  password_hash = COALESCE(password_hash, ''),
  role = COALESCE(role, 'student'),
  account_status = COALESCE(account_status, 'Active'),
  contact_number = COALESCE(contact_number, ''),
  address = COALESCE(address, ''),
  date_of_birth = COALESCE(date_of_birth, ''),
  online_status = COALESCE(online_status, 'online'),
  avatar = COALESCE(avatar, ''),
  terms_agreement_accepted = COALESCE(terms_agreement_accepted, FALSE),
  terms_version = COALESCE(terms_version, ''),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW());

ALTER TABLE users ALTER COLUMN id SET NOT NULL;
ALTER TABLE users ALTER COLUMN user_id SET NOT NULL;
ALTER TABLE users ALTER COLUMN name SET NOT NULL;
ALTER TABLE users ALTER COLUMN email SET NOT NULL;
ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE users ALTER COLUMN role SET NOT NULL;
ALTER TABLE users ALTER COLUMN account_status SET NOT NULL;
ALTER TABLE users ALTER COLUMN terms_agreement_accepted SET NOT NULL;
ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_id_unique ON users(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_user_id_unique ON users(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_lower_email ON users (LOWER(email));

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

ALTER TABLE students ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE students ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS student_number TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE students ADD COLUMN IF NOT EXISTS course TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS year_level TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS section TEXT DEFAULT '';
ALTER TABLE students ADD COLUMN IF NOT EXISTS program_status TEXT DEFAULT 'Regular';
ALTER TABLE students ADD COLUMN IF NOT EXISTS online_status TEXT DEFAULT 'offline';
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;
ALTER TABLE students ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE students ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE students ALTER COLUMN full_name SET DEFAULT '';
ALTER TABLE students ALTER COLUMN course SET DEFAULT '';
ALTER TABLE students ALTER COLUMN year_level SET DEFAULT '';
ALTER TABLE students ALTER COLUMN section SET DEFAULT '';
ALTER TABLE students ALTER COLUMN program_status SET DEFAULT 'Regular';
ALTER TABLE students ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE students ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE students ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE students ALTER COLUMN email DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_user_id_unique ON students(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_id_unique ON students(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_students_student_number_unique ON students(student_number);
CREATE INDEX IF NOT EXISTS idx_students_user_id ON students(user_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_user_id_users_id_fkey') THEN
    ALTER TABLE students
      ADD CONSTRAINT students_user_id_users_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS teachers (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  employee_id TEXT UNIQUE,
  department TEXT,
  specialization TEXT,
  assigned_courses TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE teachers ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS id TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teacher_id TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS employee_id TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS department TEXT DEFAULT 'College of Computer Studies';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS specialization TEXT DEFAULT 'Object-Oriented Programming';
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS assigned_courses TEXT;
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE teachers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE teachers ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
ALTER TABLE teachers ALTER COLUMN teacher_id SET DEFAULT ('TCH-' || SUBSTRING(gen_random_uuid()::text, 1, 8));
ALTER TABLE teachers ALTER COLUMN full_name SET DEFAULT '';
ALTER TABLE teachers ALTER COLUMN password_hash SET DEFAULT '';
ALTER TABLE teachers ALTER COLUMN department SET DEFAULT 'College of Computer Studies';
ALTER TABLE teachers ALTER COLUMN specialization SET DEFAULT 'Object-Oriented Programming';
ALTER TABLE teachers ALTER COLUMN created_at SET DEFAULT NOW();
ALTER TABLE teachers ALTER COLUMN updated_at SET DEFAULT NOW();
ALTER TABLE teachers ALTER COLUMN full_name DROP NOT NULL;
ALTER TABLE teachers ALTER COLUMN teacher_id DROP NOT NULL;
ALTER TABLE teachers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE teachers ALTER COLUMN password_hash DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_user_id_unique ON teachers(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_id_unique ON teachers(id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_teacher_id_unique ON teachers(teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_employee_id_unique ON teachers(employee_id);
CREATE INDEX IF NOT EXISTS idx_teachers_user_id ON teachers(user_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teachers_user_id_users_id_fkey') THEN
    ALTER TABLE teachers
      ADD CONSTRAINT teachers_user_id_users_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admins (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  admin_id TEXT UNIQUE,
  system_role TEXT,
  access_level TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE admins ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS admin_id TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS system_role TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS access_level TEXT;
ALTER TABLE admins ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE admins ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_user_id_unique ON admins(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_admins_admin_id_unique ON admins(admin_id);
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admins_user_id_users_id_fkey') THEN
    ALTER TABLE admins
      ADD CONSTRAINT admins_user_id_users_id_fkey
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

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
CREATE INDEX IF NOT EXISTS idx_user_terms_agreements_user ON user_terms_agreements(user_id, accepted_at DESC);

CREATE TABLE IF NOT EXISTS lessons (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  module TEXT DEFAULT '',
  sequence INTEGER NOT NULL DEFAULT 0,
  duration TEXT DEFAULT '',
  video_url TEXT DEFAULT '',
  description TEXT DEFAULT '',
  learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Draft',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS module TEXT DEFAULT '';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 0;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration TEXT DEFAULT '';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS video_url TEXT DEFAULT '';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS learning_objectives JSONB DEFAULT '[]'::jsonb;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_lessons_sequence ON lessons(sequence, title);

CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  quiz_type TEXT NOT NULL DEFAULT 'Multiple Choice',
  passing_score NUMERIC NOT NULL DEFAULT 70,
  attempts INTEGER NOT NULL DEFAULT 1,
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS lesson_id TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS quiz_type TEXT DEFAULT 'Multiple Choice';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS passing_score NUMERIC DEFAULT 70;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS attempts INTEGER DEFAULT 1;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS questions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_assessments_lesson ON assessments(lesson_id);

CREATE TABLE IF NOT EXISTS student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,
  last_position NUMERIC NOT NULL DEFAULT 0,
  completion_percentage NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  date_completed TIMESTAMPTZ,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_user_id, video_id)
);
CREATE INDEX IF NOT EXISTS idx_student_progress_student ON student_progress(student_user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id TEXT NOT NULL,
  lesson_id TEXT DEFAULT '',
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  correct_answers INTEGER NOT NULL,
  incorrect_answers INTEGER NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_number INTEGER NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  date_completed TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_user_id, date_completed DESC);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_assessment ON quiz_attempts(assessment_id, attempt_number DESC, date_completed DESC);

CREATE TABLE IF NOT EXISTS programming_challenges (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  lesson_id TEXT DEFAULT '',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  starter_code TEXT DEFAULT '',
  sample_input TEXT DEFAULT '',
  sample_output TEXT DEFAULT '',
  passing_score NUMERIC NOT NULL DEFAULT 70,
  status TEXT NOT NULL DEFAULT 'Draft',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE programming_challenges DROP CONSTRAINT IF EXISTS programming_challenges_lesson_id_fkey;
ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS lesson_id TEXT DEFAULT '';
ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';
ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE programming_challenges ALTER COLUMN lesson_id SET DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_programming_challenges_lesson ON programming_challenges(lesson_id);

CREATE TABLE IF NOT EXISTS challenge_test_cases (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES programming_challenges(id) ON DELETE CASCADE,
  input TEXT DEFAULT '',
  expected_output TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT TRUE,
  matcher TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_challenge_test_cases_challenge ON challenge_test_cases(challenge_id);

CREATE TABLE IF NOT EXISTS practice_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  challenge_id TEXT NOT NULL REFERENCES programming_challenges(id) ON DELETE CASCADE,
  source_code TEXT NOT NULL,
  program_output TEXT DEFAULT '',
  compile_status TEXT NOT NULL DEFAULT 'not_run' CHECK (compile_status IN ('not_run', 'success', 'failed', 'runtime_error')),
  runtime NUMERIC DEFAULT 0,
  memory_usage NUMERIC,
  score NUMERIC NOT NULL DEFAULT 0,
  error_message TEXT DEFAULT '',
  test_results JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_locked BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE(student_id, challenge_id)
);
ALTER TABLE practice_submissions ADD COLUMN IF NOT EXISTS is_locked BOOLEAN DEFAULT TRUE;
CREATE INDEX IF NOT EXISTS idx_practice_submissions_student ON practice_submissions(student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_practice_submissions_challenge ON practice_submissions(challenge_id);

CREATE TABLE IF NOT EXISTS recommendation_history (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  student_name TEXT DEFAULT '',
  lesson_id TEXT NOT NULL,
  lesson_title TEXT DEFAULT '',
  current_topic TEXT DEFAULT '',
  recommendation_type TEXT NOT NULL CHECK (recommendation_type IN ('Remedial', 'Continue', 'Advanced')),
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('Video Completion', 'Quiz Score', 'Coding Score', 'Lesson Completion')),
  reason TEXT NOT NULL,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_action_label TEXT DEFAULT '',
  target_view TEXT DEFAULT 'dashboard',
  quiz_score NUMERIC,
  coding_score NUMERIC,
  video_completed BOOLEAN NOT NULL DEFAULT FALSE,
  lesson_completed BOOLEAN NOT NULL DEFAULT FALSE,
  quiz_attempts INTEGER,
  coding_attempts INTEGER,
  progress_percentage NUMERIC,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_student ON recommendation_history(student_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS idx_recommendation_history_type ON recommendation_history(recommendation_type, status);

CREATE TABLE IF NOT EXISTS login_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  login_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, login_date)
);
CREATE INDEX IF NOT EXISTS idx_login_history_student ON login_history(student_id, login_date DESC);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES lessons(id) ON DELETE CASCADE,
  video_completed BOOLEAN NOT NULL DEFAULT FALSE,
  quiz_passed BOOLEAN NOT NULL DEFAULT FALSE,
  practice_completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);
ALTER TABLE lesson_progress DROP CONSTRAINT IF EXISTS lesson_progress_lesson_id_fkey;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS student_id UUID;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS lesson_id TEXT;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS video_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS quiz_passed BOOLEAN DEFAULT FALSE;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS practice_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE lesson_progress ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_progress' AND column_name = 'teacher_student_id'
  ) THEN
    ALTER TABLE lesson_progress ALTER COLUMN teacher_student_id DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_progress' AND column_name = 'current_topic'
  ) THEN
    ALTER TABLE lesson_progress ALTER COLUMN current_topic SET DEFAULT '';
    ALTER TABLE lesson_progress ALTER COLUMN current_topic DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'lesson_progress' AND column_name = 'current_stage'
  ) THEN
    ALTER TABLE lesson_progress ALTER COLUMN current_stage SET DEFAULT '';
    ALTER TABLE lesson_progress ALTER COLUMN current_stage DROP NOT NULL;
  END IF;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS idx_lesson_progress_student_lesson_unique ON lesson_progress(student_id, lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  "current_time" NUMERIC NOT NULL DEFAULT 0,
  duration NUMERIC NOT NULL DEFAULT 0,
  watch_percentage NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_video_progress_student ON video_progress(student_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS practice_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenge_id TEXT NOT NULL REFERENCES programming_challenges(id) ON DELETE CASCADE,
  started BOOLEAN NOT NULL DEFAULT TRUE,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  score NUMERIC NOT NULL DEFAULT 0,
  source_code TEXT,
  submission_count INTEGER NOT NULL DEFAULT 1,
  completion_time_seconds INTEGER,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, challenge_id)
);

CREATE TABLE IF NOT EXISTS student_xp (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  xp_amount INTEGER NOT NULL,
  source_activity TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_student_xp_student ON student_xp(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  badge_title TEXT NOT NULL,
  badge_desc TEXT NOT NULL,
  badge_icon TEXT NOT NULL,
  badge_color TEXT NOT NULL,
  awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, badge_name)
);

CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL,
  activity_detail TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_activity_logs_student ON activity_logs(student_id, created_at DESC);

-- Legacy OOP course tables retained for existing data and older reports.
CREATE TABLE IF NOT EXISTS oop_courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oop_lessons (
  id TEXT PRIMARY KEY,
  course_id TEXT NOT NULL REFERENCES oop_courses(id) ON DELETE CASCADE,
  lesson_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  video_source TEXT NOT NULL,
  duration TEXT DEFAULT '',
  completion_threshold NUMERIC NOT NULL DEFAULT 95,
  assessment_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(course_id, lesson_number)
);

CREATE TABLE IF NOT EXISTS oop_video_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL REFERENCES oop_lessons(id) ON DELETE CASCADE,
  last_position NUMERIC NOT NULL DEFAULT 0,
  completion_percentage NUMERIC NOT NULL DEFAULT 0,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  date_completed TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS oop_assessments (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES oop_lessons(id) ON DELETE CASCADE,
  passing_percentage NUMERIC NOT NULL DEFAULT 70,
  questions_count INTEGER NOT NULL DEFAULT 25,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oop_assessment_questions (
  id TEXT PRIMARY KEY,
  assessment_id TEXT NOT NULL REFERENCES oop_assessments(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oop_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  assessment_id TEXT NOT NULL REFERENCES oop_assessments(id) ON DELETE CASCADE,
  score INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  correct_answers INTEGER NOT NULL,
  incorrect_answers INTEGER NOT NULL,
  passed BOOLEAN NOT NULL DEFAULT FALSE,
  attempt_number INTEGER NOT NULL,
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  date_completed TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS oop_student_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  course_id TEXT NOT NULL REFERENCES oop_courses(id) ON DELETE CASCADE,
  current_lesson_id TEXT REFERENCES oop_lessons(id) ON DELETE SET NULL,
  completed_lessons INTEGER NOT NULL DEFAULT 0,
  locked_lessons INTEGER NOT NULL DEFAULT 4,
  overall_progress_percentage NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, course_id)
);

CREATE TABLE IF NOT EXISTS teacher_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'removed')),
  UNIQUE(teacher_id, student_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_email TEXT NOT NULL,
  invitation_code TEXT NOT NULL UNIQUE,
  invitation_link TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'expired')),
  accepted_by_student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS assessment_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_student_id UUID NOT NULL REFERENCES teacher_students(id) ON DELETE CASCADE,
  assessment_id TEXT REFERENCES oop_assessments(id) ON DELETE SET NULL,
  attempts_count INTEGER NOT NULL DEFAULT 0,
  highest_score NUMERIC NOT NULL DEFAULT 0,
  average_score NUMERIC NOT NULL DEFAULT 0,
  lowest_score NUMERIC NOT NULL DEFAULT 0,
  correct_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  incorrect_questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  question_analysis JSONB NOT NULL DEFAULT '{}'::jsonb,
  completion_time_seconds INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS practice_ide_monitoring (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_student_id UUID NOT NULL REFERENCES teacher_students(id) ON DELETE CASCADE,
  submission_id UUID REFERENCES practice_submissions(id) ON DELETE SET NULL,
  programming_challenge TEXT NOT NULL,
  student_code TEXT NOT NULL,
  compilation_result TEXT NOT NULL DEFAULT 'not_run',
  runtime_errors TEXT DEFAULT '',
  program_output TEXT DEFAULT '',
  expected_output TEXT DEFAULT '',
  passed_test_cases INTEGER NOT NULL DEFAULT 0,
  failed_test_cases INTEGER NOT NULL DEFAULT 0,
  execution_time_ms NUMERIC NOT NULL DEFAULT 0,
  memory_usage_mb NUMERIC,
  automatic_grade NUMERIC NOT NULL DEFAULT 0,
  teacher_feedback TEXT DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS performance_indexes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_student_id UUID NOT NULL REFERENCES teacher_students(id) ON DELETE CASCADE,
  quiz_score NUMERIC NOT NULL DEFAULT 0,
  practice_ide_score NUMERIC NOT NULL DEFAULT 0,
  video_completion_rate NUMERIC NOT NULL DEFAULT 0,
  performance_index NUMERIC NOT NULL DEFAULT 0,
  learning_status TEXT NOT NULL CHECK (learning_status IN ('In Progress', 'Completed', 'Mastered', 'Needs Improvement', 'At Risk')),
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adaptive_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_student_id UUID NOT NULL REFERENCES teacher_students(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  rule_applied TEXT NOT NULL,
  recommendation TEXT NOT NULL,
  next_activity_id TEXT,
  unlock_next_activity BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS teacher_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS learning_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  average_quiz_score NUMERIC NOT NULL DEFAULT 0,
  average_practice_ide_score NUMERIC NOT NULL DEFAULT 0,
  video_completion_rate NUMERIC NOT NULL DEFAULT 0,
  performance_index NUMERIC NOT NULL DEFAULT 0,
  most_difficult_topic TEXT DEFAULT '',
  most_failed_topic TEXT DEFAULT '',
  most_successful_student_id TEXT REFERENCES students(id) ON DELETE SET NULL,
  students_at_risk INTEGER NOT NULL DEFAULT 0,
  learning_completion_rate NUMERIC NOT NULL DEFAULT 0,
  programming_success_rate NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS realtime_learning_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teacher_students_teacher ON teacher_students(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_students_student ON teacher_students(student_id);
CREATE INDEX IF NOT EXISTS idx_invitations_code ON invitations(invitation_code);
CREATE INDEX IF NOT EXISTS idx_teacher_notifications_teacher ON teacher_notifications(teacher_id, is_read);
CREATE INDEX IF NOT EXISTS idx_realtime_learning_events_teacher ON realtime_learning_events(teacher_id, processed);

INSERT INTO oop_courses (id, name, description)
VALUES ('oop_fundamentals', 'OOP Fundamentals', 'Local-video Java OOP fundamentals course.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO oop_lessons (id, course_id, lesson_number, title, video_source, duration, assessment_id)
VALUES
  ('oop_lesson_1', 'oop_fundamentals', 1, 'Classes & Objects', '/videos/lesson1.mp4', '13:50', 'oop_assessment_1'),
  ('oop_lesson_2', 'oop_fundamentals', 2, 'Constructors', '/videos/lesson2.mp4', '17:29', 'oop_assessment_2'),
  ('oop_lesson_3', 'oop_fundamentals', 3, 'Object Methods', '/videos/lesson3.mp4', '18:15', 'oop_assessment_3'),
  ('oop_lesson_4', 'oop_fundamentals', 4, 'Encapsulation', '/videos/lesson4.mp4', '12:05', 'oop_assessment_4'),
  ('oop_lesson_5', 'oop_fundamentals', 5, 'Constructor Overloading', '/videos/lesson5.mp4', '10:42', 'oop_assessment_5'),
  ('oop_lesson_6', 'oop_fundamentals', 6, 'Inheritance', '/videos/lesson6.mp4', '16:10', 'oop_assessment_6'),
  ('oop_lesson_7', 'oop_fundamentals', 7, 'Polymorphism', '/videos/lesson7.mp4', '14:20', 'oop_assessment_7'),
  ('oop_lesson_8', 'oop_fundamentals', 8, 'Abstract Classes', '/videos/lesson8.mp4', '11:55', 'oop_assessment_8'),
  ('oop_lesson_9', 'oop_fundamentals', 9, 'Interfaces / Abstraction', '/videos/lesson9.mp4', '13:35', 'oop_assessment_9'),
  ('oop_lesson_10', 'oop_fundamentals', 10, 'Array of Objects', '/videos/lesson10.mp4', '18:40', 'oop_assessment_10'),
  ('oop_lesson_11', 'oop_fundamentals', 11, 'Enum', '/videos/lesson11.mp4', '15:25', 'oop_assessment_11')
ON CONFLICT (id) DO UPDATE
SET title = EXCLUDED.title,
    video_source = EXCLUDED.video_source,
    duration = EXCLUDED.duration,
    assessment_id = EXCLUDED.assessment_id;

INSERT INTO oop_assessments (id, lesson_id, passing_percentage, questions_count)
VALUES
  ('oop_assessment_1', 'oop_lesson_1', 70, 25),
  ('oop_assessment_2', 'oop_lesson_2', 70, 25),
  ('oop_assessment_3', 'oop_lesson_3', 70, 25),
  ('oop_assessment_4', 'oop_lesson_4', 70, 25),
  ('oop_assessment_5', 'oop_lesson_5', 70, 25),
  ('oop_assessment_6', 'oop_lesson_6', 70, 25),
  ('oop_assessment_7', 'oop_lesson_7', 70, 25),
  ('oop_assessment_8', 'oop_lesson_8', 70, 25),
  ('oop_assessment_9', 'oop_lesson_9', 70, 25),
  ('oop_assessment_10', 'oop_lesson_10', 70, 25),
  ('oop_assessment_11', 'oop_lesson_11', 70, 25)
ON CONFLICT (id) DO UPDATE
SET passing_percentage = EXCLUDED.passing_percentage,
    questions_count = EXCLUDED.questions_count;

CREATE TABLE IF NOT EXISTS swing_lessons (
  id TEXT PRIMARY KEY,
  sequence INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL,
  topics JSONB NOT NULL DEFAULT '[]'::jsonb,
  objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  content JSONB NOT NULL DEFAULT '[]'::jsonb,
  code_example TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS swing_videos (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES swing_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  embed_url TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS swing_quizzes (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES swing_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  passing_percentage INTEGER NOT NULL DEFAULT 80,
  question_count INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS swing_questions (
  id TEXT PRIMARY KEY,
  quiz_id TEXT NOT NULL REFERENCES swing_quizzes(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  choices JSONB NOT NULL DEFAULT '[]'::jsonb,
  correct_answer TEXT NOT NULL,
  explanation TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS swing_programming_exercises (
  id TEXT PRIMARY KEY,
  lesson_id TEXT NOT NULL REFERENCES swing_lessons(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'Beginner',
  instructions TEXT NOT NULL,
  starter_code TEXT NOT NULL DEFAULT '',
  test_cases JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS swing_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  exercise_id TEXT NOT NULL REFERENCES swing_programming_exercises(id) ON DELETE CASCADE,
  source_code TEXT NOT NULL,
  program_output TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'submitted',
  score NUMERIC NOT NULL DEFAULT 0,
  feedback TEXT NOT NULL DEFAULT '',
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  graded_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS swing_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL REFERENCES swing_lessons(id) ON DELETE CASCADE,
  content_completed BOOLEAN NOT NULL DEFAULT FALSE,
  video_completed BOOLEAN NOT NULL DEFAULT FALSE,
  quiz_passed BOOLEAN NOT NULL DEFAULT FALSE,
  exercise_completed BOOLEAN NOT NULL DEFAULT FALSE,
  overall_percentage NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_swing_videos_lesson ON swing_videos(lesson_id);
CREATE INDEX IF NOT EXISTS idx_swing_questions_quiz ON swing_questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_swing_submissions_student ON swing_submissions(student_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_swing_progress_student ON swing_progress(student_id, lesson_id);
