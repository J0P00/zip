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
