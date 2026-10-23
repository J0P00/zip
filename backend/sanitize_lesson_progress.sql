-- ============================================================================
-- OOP Pedagogical Hub: Dynamic Lesson Catalog & Progression Audit Script
-- ============================================================================
-- Purpose:
--   Performs a safe, read-only progression audit (by default) for all students
--   against the active, dynamic database lesson catalog.
--
-- Core Principles & Safety:
--   1. Dynamic Catalog: Derives lessons and ordering dynamically from the `lessons`
--      table. No hardcoded count limits (17, 18, etc.) and no sequence generation assumptions.
--   2. Strict Gating Rules: A lesson is sequentially complete iff:
--        - video_completed = TRUE (>= 95%)
--        - quiz_passed = TRUE (>= 80%)
--        - practice_submitted = TRUE (valid practice submission)
--   3. Required Course Prerequisites:
--        - The 12 required Java OOP lessons (oop_lesson_1 .. oop_lesson_12) must be complete
--          before any Java Swing lesson can be accessed or completed.
--   4. Evidence Preservation:
--        - NEVER wipes or resets student progress, video watch percentage,
--          assessment scores, quiz attempts, practice code, or teacher feedback.
--        - Access violations (e.g. studying Lesson 5 while Lesson 4 was incomplete)
--          are reported separately from historical records.
--   5. Default Mode:
--        - READ-ONLY AUDIT (v_dry_run := TRUE).
--        - If v_dry_run is set to FALSE, it ONLY reconciles the `completed` flag
--          (completed = FALSE, completed_at = NULL) on out-of-sequence records so
--          sequential order is respected, while leaving all learning evidence intact.
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/sanitize_lesson_progress.sql
--   or execute directly in Neon SQL Editor / pgAdmin.
-- ============================================================================

DO $$
DECLARE
    -- ------------------------------------------------------------------------
    -- CONFIGURATION (Default: Safe Read-Only Audit)
    -- ------------------------------------------------------------------------
    v_dry_run BOOLEAN := TRUE; -- Default: TRUE (Read-only audit). Change to FALSE only to reconcile completion flags.
    
    -- Canonical 12 Required OOP Lessons
    v_required_oop_ids TEXT[] := ARRAY[
        'oop_lesson_1', 'oop_lesson_2', 'oop_lesson_3', 'oop_lesson_4',
        'oop_lesson_5', 'oop_lesson_6', 'oop_lesson_7', 'oop_lesson_8',
        'oop_lesson_9', 'oop_lesson_10', 'oop_lesson_11', 'oop_lesson_12'
    ];

    -- Counters for reporting
    v_total_students INT := 0;
    v_students_with_violations INT := 0;
    v_total_lessons_in_catalog INT := 0;
    v_oop_lessons_count INT := 0;
    v_swing_lessons_count INT := 0;
    v_total_progress_rows INT := 0;
    v_valid_sequential_completions INT := 0;
    v_access_violations INT := 0;
    v_reconciled_flags INT := 0;

    -- Iteration variables
    r_student RECORD;
    r_lesson RECORD;
    r_lp RECORD;
    v_chain_broken BOOLEAN;
    v_break_lesson_id TEXT;
    v_break_lesson_title TEXT;
    v_break_reason TEXT;
    v_is_strictly_complete BOOLEAN;
    v_is_swing BOOLEAN;
    v_required_oop_complete BOOLEAN;
    v_completed_required_oop_count INT;
BEGIN
    -- Temporary audit table for reporting findings
    CREATE TEMP TABLE IF NOT EXISTS temp_progression_audit_log (
        student_id UUID,
        student_email TEXT,
        lesson_id TEXT,
        lesson_title TEXT,
        lesson_sequence INT,
        course_track TEXT,
        audit_status TEXT,
        violation_reason TEXT,
        historical_evidence TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    ) ON COMMIT DROP;

    DELETE FROM temp_progression_audit_log;

    -- Count dynamic catalog lessons
    SELECT COUNT(*),
           COUNT(*) FILTER (WHERE id NOT LIKE 'swing_%' AND COALESCE(course_id, '') <> 'java_swing' AND LOWER(COALESCE(module, '')) NOT LIKE '%swing%' AND COALESCE(track, '') <> 'swing'),
           COUNT(*) FILTER (WHERE id LIKE 'swing_%' OR COALESCE(course_id, '') = 'java_swing' OR LOWER(COALESCE(module, '')) LIKE '%swing%' OR COALESCE(track, '') = 'swing')
    INTO v_total_lessons_in_catalog, v_oop_lessons_count, v_swing_lessons_count
    FROM lessons
    WHERE status <> 'Archived';

    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'OOP PEDAGOGICAL HUB: SAFE PROGRESSION & DYNAMIC CATALOG AUDIT';
    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'Audit Mode                 : %', CASE WHEN v_dry_run THEN 'READ-ONLY AUDIT (Safe / No DB Writes)' ELSE 'RECONCILE COMPLETIONS (Preserving Progress)' END;
    RAISE NOTICE 'Active Lessons in Database : % (OOP: %, Swing: %)', v_total_lessons_in_catalog, v_oop_lessons_count, v_swing_lessons_count;
    RAISE NOTICE 'Required Core OOP Lessons  : % (Canonical IDs: oop_lesson_1 .. oop_lesson_12)', array_length(v_required_oop_ids, 1);
    RAISE NOTICE '================================================================================';

    -- Loop over every student in the database
    FOR r_student IN (
        SELECT DISTINCT u.id AS student_id, u.email, u.name
        FROM users u
        WHERE u.role = 'student'
           OR u.id IN (SELECT DISTINCT student_id FROM lesson_progress WHERE student_id IS NOT NULL)
        ORDER BY u.email
    ) LOOP
        v_total_students := v_total_students + 1;
        v_chain_broken := FALSE;
        v_break_lesson_id := NULL;
        v_break_lesson_title := NULL;
        v_break_reason := NULL;

        -- 1. Check completion of the 12 required OOP lessons for this student
        SELECT COUNT(DISTINCT lp.lesson_id)
        INTO v_completed_required_oop_count
        FROM lesson_progress lp
        WHERE lp.student_id = r_student.student_id
          AND lp.lesson_id = ANY(v_required_oop_ids)
          AND lp.video_completed = TRUE
          AND lp.quiz_passed = TRUE
          AND (lp.practice_submitted = TRUE OR lp.practice_completed = TRUE);

        v_required_oop_complete := (v_completed_required_oop_count >= array_length(v_required_oop_ids, 1));

        -- 2. Sequentially evaluate each lesson in active dynamic catalog
        FOR r_lesson IN (
            SELECT id, title, sequence, module, course_id, track,
                   CASE
                     WHEN id LIKE 'swing_%' OR COALESCE(course_id, '') = 'java_swing' OR LOWER(COALESCE(module, '')) LIKE '%swing%' OR COALESCE(track, '') = 'swing' THEN TRUE
                     ELSE FALSE
                   END AS is_swing
            FROM lessons
            WHERE status <> 'Archived'
            ORDER BY
              CASE
                WHEN id LIKE 'swing_%' OR COALESCE(course_id, '') = 'java_swing' OR LOWER(COALESCE(module, '')) LIKE '%swing%' OR COALESCE(track, '') = 'swing' THEN 1
                ELSE 0
              END ASC,
              sequence ASC,
              id ASC
        ) LOOP
            -- Look up student's actual lesson_progress record using schema relationships
            SELECT lp.*
            INTO r_lp
            FROM lesson_progress lp
            WHERE lp.student_id = r_student.student_id
              AND (lp.lesson_id = r_lesson.id OR lp.lesson_id = REPLACE(r_lesson.id, 'oop_lesson_', ''))
            LIMIT 1;

            IF r_lp.id IS NOT NULL THEN
                v_total_progress_rows := v_total_progress_rows + 1;
            END IF;

            -- Evaluate Swing gating prerequisite
            IF r_lesson.is_swing AND NOT v_required_oop_complete THEN
                IF r_lp.id IS NOT NULL AND (r_lp.video_completed OR r_lp.quiz_passed OR r_lp.practice_submitted OR r_lp.completed) THEN
                    v_access_violations := v_access_violations + 1;
                    INSERT INTO temp_progression_audit_log (
                        student_id, student_email, lesson_id, lesson_title, lesson_sequence, course_track,
                        audit_status, violation_reason, historical_evidence
                    ) VALUES (
                        r_student.student_id, r_student.email, r_lesson.id, r_lesson.title, r_lesson.sequence, 'Swing',
                        'SWING_PREREQUISITE_VIOLATION',
                        'Swing lesson accessed before completing all 12 required OOP lessons (' || v_completed_required_oop_count || '/12 completed)',
                        'Video: ' || COALESCE(r_lp.video_completed, FALSE) || ', Quiz: ' || COALESCE(r_lp.quiz_passed, FALSE) || ', Practice: ' || COALESCE(r_lp.practice_submitted, FALSE) || ' (Evidence Preserved)'
                    );

                    -- Only reconcile completion flag if write mode explicitly enabled
                    IF NOT v_dry_run AND COALESCE(r_lp.completed, FALSE) = TRUE THEN
                        UPDATE lesson_progress SET completed = FALSE, completed_at = NULL, updated_at = NOW() WHERE id = r_lp.id;
                        v_reconciled_flags := v_reconciled_flags + 1;
                    END IF;
                END IF;
                CONTINUE;
            END IF;

            -- Check sequential predecessor chain
            IF v_chain_broken THEN
                -- Any interaction with this advanced lesson before predecessor was complete is an access violation
                IF r_lp.id IS NOT NULL AND (r_lp.video_completed OR r_lp.quiz_passed OR r_lp.practice_submitted OR r_lp.completed) THEN
                    v_access_violations := v_access_violations + 1;
                    INSERT INTO temp_progression_audit_log (
                        student_id, student_email, lesson_id, lesson_title, lesson_sequence,
                        course_track, audit_status, violation_reason, historical_evidence
                    ) VALUES (
                        r_student.student_id, r_student.email, r_lesson.id, r_lesson.title, r_lesson.sequence,
                        CASE WHEN r_lesson.is_swing THEN 'Swing' ELSE 'OOP' END,
                        'OUT_OF_SEQUENCE_ACCESS',
                        'Predecessor lesson ' || v_break_lesson_id || ' ("' || v_break_lesson_title || '") incomplete: ' || v_break_reason,
                        'Video: ' || COALESCE(r_lp.video_completed, FALSE) || ', Quiz: ' || COALESCE(r_lp.quiz_passed, FALSE) || ', Practice: ' || COALESCE(r_lp.practice_submitted, FALSE) || ' (Evidence Preserved)'
                    );

                    IF NOT v_dry_run AND COALESCE(r_lp.completed, FALSE) = TRUE THEN
                        UPDATE lesson_progress SET completed = FALSE, completed_at = NULL, updated_at = NOW() WHERE id = r_lp.id;
                        v_reconciled_flags := v_reconciled_flags + 1;
                    END IF;
                END IF;
            ELSE
                -- Predecessor chain is currently intact
                IF r_lp.id IS NOT NULL THEN
                    v_is_strictly_complete := (
                        COALESCE(r_lp.video_completed, FALSE) = TRUE
                        AND COALESCE(r_lp.quiz_passed, FALSE) = TRUE
                        AND (
                            COALESCE(r_lp.practice_submitted, FALSE) = TRUE
                            OR COALESCE(r_lp.practice_completed, FALSE) = TRUE
                        )
                    );

                    IF v_is_strictly_complete THEN
                        v_valid_sequential_completions := v_valid_sequential_completions + 1;
                        IF NOT v_dry_run AND (r_lp.completed IS NOT TRUE OR r_lp.completed_at IS NULL) THEN
                            UPDATE lesson_progress SET completed = TRUE, completed_at = COALESCE(completed_at, NOW()), updated_at = NOW() WHERE id = r_lp.id;
                            v_reconciled_flags := v_reconciled_flags + 1;
                        END IF;
                    ELSE
                        -- Predecessor chain terminates at this incomplete lesson
                        v_chain_broken := TRUE;
                        v_break_lesson_id := r_lesson.id;
                        v_break_lesson_title := r_lesson.title;
                        v_break_reason := CASE
                            WHEN COALESCE(r_lp.video_completed, FALSE) = FALSE THEN 'video incomplete (<95%)'
                            WHEN COALESCE(r_lp.quiz_passed, FALSE) = FALSE THEN 'assessment not passed (<80%)'
                            ELSE 'practice not submitted'
                        END;

                        IF NOT v_dry_run AND COALESCE(r_lp.completed, FALSE) = TRUE THEN
                            UPDATE lesson_progress SET completed = FALSE, completed_at = NULL, updated_at = NOW() WHERE id = r_lp.id;
                            v_reconciled_flags := v_reconciled_flags + 1;
                        END IF;
                    END IF;
                ELSE
                    -- Missing progress record breaks the sequential chain
                    v_chain_broken := TRUE;
                    v_break_lesson_id := r_lesson.id;
                    v_break_lesson_title := r_lesson.title;
                    v_break_reason := 'no progress record (not started)';
                END IF;
            END IF;
        END LOOP;

        IF EXISTS (SELECT 1 FROM temp_progression_audit_log WHERE student_id = r_student.student_id) THEN
            v_students_with_violations := v_students_with_violations + 1;
        END IF;
    END LOOP;

    -- ------------------------------------------------------------------------
    -- AUDIT REPORT LOGGING
    -- ------------------------------------------------------------------------
    RAISE NOTICE '--------------------------------------------------------------------------------';
    RAISE NOTICE 'SAMPLE OF AUDIT FINDINGS (ACCESS VIOLATIONS DETECTED):';
    RAISE NOTICE '--------------------------------------------------------------------------------';
    FOR r_student IN (
        SELECT student_email, lesson_id, course_track, audit_status, violation_reason, historical_evidence
        FROM temp_progression_audit_log
        ORDER BY student_email, lesson_id
        LIMIT 25
    ) LOOP
        RAISE NOTICE '[%] Student: % | Lesson: % | Status: % | Reason: % | %',
            r_student.course_track, r_student.student_email, r_student.lesson_id,
            r_student.audit_status, r_student.violation_reason, r_student.historical_evidence;
    END LOOP;

    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'AUDIT SUMMARY';
    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'Total Students Evaluated       : %', v_total_students;
    RAISE NOTICE 'Students with Out-of-Seq Access: %', v_students_with_violations;
    RAISE NOTICE 'Total Progress Rows Inspected  : %', v_total_progress_rows;
    RAISE NOTICE 'Valid Sequential Completions   : %', v_valid_sequential_completions;
    RAISE NOTICE 'Access Sequence Violations     : %', v_access_violations;
    RAISE NOTICE 'Historical Progress Wiped      : 0 (All evidence preserved strictly)';
    IF NOT v_dry_run THEN
        RAISE NOTICE 'Completion Flags Reconciled    : %', v_reconciled_flags;
        RAISE NOTICE 'Status                         : RECONCILIATION COMMITTED';
    ELSE
        RAISE NOTICE 'Status                         : READ-ONLY AUDIT COMPLETE (Zero records modified)';
    END IF;
    RAISE NOTICE '================================================================================';
END $$;
