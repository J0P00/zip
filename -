CREATE EXTENSION IF NOT EXISTS pgcrypto;


        DO $$ BEGIN
          CREATE TYPE user_role AS ENUM ('student', 'teacher', 'admin');
        EXCEPTION WHEN duplicate_object THEN NULL;
        END $$
    


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
        END $$
    


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
        ALTER TABLE users ADD COLUMN IF NOT EXISTS role user_role DEFAULT 'student';
        ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
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
          user_id = COALESCE(NULLIF(user_id, ''), UPPER(LEFT(role::TEXT, 3)) || '-' || SUBSTRING(MD5(email), 1, 8)),
          name = COALESCE(NULLIF(name, ''), email),
          password_hash = COALESCE(password_hash, ''),
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
        ALTER TABLE users ALTER COLUMN password_hash SET NOT NULL;
        ALTER TABLE users ALTER COLUMN account_status SET NOT NULL;
        ALTER TABLE users ALTER COLUMN terms_agreement_accepted SET NOT NULL;
        ALTER TABLE users ALTER COLUMN created_at SET NOT NULL;
        ALTER TABLE users ALTER COLUMN updated_at SET NOT NULL;
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
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb;
        ALTER TABLE lessons ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Draft';
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
        ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Draft';
        ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE programming_challenges ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
        CREATE TABLE IF NOT EXISTS challenge_test_cases (
          id TEXT PRIMARY KEY,
          challenge_id TEXT NOT NULL REFERENCES programming_challenges(id) ON DELETE CASCADE,
          input TEXT DEFAULT '',
          expected_output TEXT NOT NULL,
          is_hidden BOOLEAN NOT NULL DEFAULT TRUE,
          matcher TEXT DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE TABLE IF NOT EXISTS practice_submissions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id TEXT NOT NULL,
          challenge_id TEXT NOT NULL REFERENCES programming_challenges(id) ON DELETE CASCADE,
          source_code TEXT NOT NULL,
          program_output TEXT DEFAULT '',
          compile_status TEXT NOT NULL DEFAULT 'not_run',
          runtime NUMERIC DEFAULT 0,
          memory_usage NUMERIC,
          score NUMERIC NOT NULL DEFAULT 0,
          error_message TEXT DEFAULT '',
          test_results JSONB NOT NULL DEFAULT '[]'::jsonb,
          submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          is_locked BOOLEAN NOT NULL DEFAULT TRUE,
          UNIQUE(student_id, challenge_id)
        );
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

        CREATE TABLE IF NOT EXISTS lesson_progress (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          student_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          lesson_id TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
          video_completed BOOLEAN NOT NULL DEFAULT FALSE,
          quiz_passed BOOLEAN NOT NULL DEFAULT FALSE,
          practice_completed BOOLEAN NOT NULL DEFAULT FALSE,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          completed_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(student_id, lesson_id)
        );

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
    