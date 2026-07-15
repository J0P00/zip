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

CREATE TABLE IF NOT EXISTS programming_challenges (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL,
  lesson_id TEXT REFERENCES oop_lessons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  learning_objectives JSONB NOT NULL DEFAULT '[]'::jsonb,
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  starter_code TEXT DEFAULT '',
  sample_input TEXT DEFAULT '',
  sample_output TEXT DEFAULT '',
  passing_score NUMERIC NOT NULL DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  teacher_id TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  department TEXT DEFAULT 'College of Computer Studies',
  specialization TEXT DEFAULT 'Object-Oriented Programming',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  full_name TEXT NOT NULL,
  student_number TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  course TEXT DEFAULT '',
  year_level TEXT DEFAULT '',
  section TEXT DEFAULT '',
  online_status TEXT NOT NULL DEFAULT 'offline' CHECK (online_status IN ('online', 'offline', 'away', 'busy')),
  last_activity_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

CREATE TABLE IF NOT EXISTS lesson_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_student_id UUID NOT NULL REFERENCES teacher_students(id) ON DELETE CASCADE,
  lesson_id TEXT REFERENCES oop_lessons(id) ON DELETE SET NULL,
  current_topic TEXT NOT NULL,
  current_stage TEXT NOT NULL,
  video_completion NUMERIC NOT NULL DEFAULT 0,
  assessment_score NUMERIC NOT NULL DEFAULT 0,
  practice_ide_score NUMERIC NOT NULL DEFAULT 0,
  module_progress NUMERIC NOT NULL DEFAULT 0,
  topic_progress NUMERIC NOT NULL DEFAULT 0,
  overall_progress NUMERIC NOT NULL DEFAULT 0,
  module_completed BOOLEAN NOT NULL DEFAULT FALSE,
  topic_completed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  ('oop_lesson_5', 'oop_fundamentals', 5, 'Constructor Overloading', '/videos/lesson5.mp4', '10:42', 'oop_assessment_5')
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
  ('oop_assessment_5', 'oop_lesson_5', 70, 25)
ON CONFLICT (id) DO UPDATE
SET passing_percentage = EXCLUDED.passing_percentage,
    questions_count = EXCLUDED.questions_count;
