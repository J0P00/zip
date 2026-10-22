-- ============================================================================
-- OOP Pedagogical Hub: Sequential Lesson Progress Sanitization Script
-- ============================================================================
-- Purpose:
--   Sanitizes the `lesson_progress` table for all users by enforcing strict
--   sequential progression rules from Lesson 1 to Lesson 18.
--
-- Sequential Rules Enforced:
--   1. A lesson is strictly COMPLETE if and only if:
--        video_completed = TRUE
--        AND (quiz_passed = TRUE OR assessment_passed = TRUE)
--        AND (practice_submitted = TRUE OR practice_completed = TRUE)
--   2. Lesson 1 is unlocked by default.
--   3. For any subsequent Lesson i (2 <= i <= 18):
--        Access/completion is strictly dependent on Lesson (i - 1) meeting ALL
--        three completion requirements.
--   4. If an immediate predecessor does not meet all three requirements:
--        Any advanced lesson records (Lesson i .. 18) are invalid legacy records.
--        Depending on ACTION_TYPE ('LOCK' or 'DELETE'), the script will:
--          - 'LOCK': Revoke completion, reset completion flags, and lock access.
--          - 'DELETE': Permanently remove the unauthorized advanced records.
--
-- Usage:
--   psql "$DATABASE_URL" -f backend/sanitize_lesson_progress.sql
--   or execute directly in Neon SQL Editor / pgAdmin.
-- ============================================================================

DO $$
DECLARE
    -- ------------------------------------------------------------------------
    -- CONFIGURATION PARAMETERS
    -- ------------------------------------------------------------------------
    -- 'LOCK'   : Resets completed=FALSE, completed_at=NULL, video/quiz/practice flags=FALSE.
    -- 'DELETE' : Deletes out-of-sequence lesson_progress records from the database.
    v_action TEXT := 'LOCK';

    -- Set to TRUE to preview what would be changed without modifying data.
    -- Set to FALSE to apply the sanitization changes.
    v_dry_run BOOLEAN := FALSE;

    -- Sequence range to evaluate (1 to 18)
    v_min_seq INT := 1;
    v_max_seq INT := 18;

    -- Counters for reporting
    v_total_students INT := 0;
    v_students_with_violations INT := 0;
    v_records_inspected INT := 0;
    v_records_sanitized INT := 0;
    v_records_deleted INT := 0;
    v_valid_completions INT := 0;

    -- Working variables
    r_student RECORD;
    v_seq INT;
    v_chain_broken BOOLEAN;
    v_break_seq INT;
    v_break_reason TEXT;
    
    r_lp RECORD;
    v_is_strictly_complete BOOLEAN;
    v_has_assessment_passed_col BOOLEAN;
BEGIN
    -- Check if optional column 'assessment_passed' exists on lesson_progress
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'lesson_progress' 
          AND column_name = 'assessment_passed'
    ) INTO v_has_assessment_passed_col;

    -- Create temporary table to audit all sanitized records
    CREATE TEMP TABLE IF NOT EXISTS temp_sanitization_audit (
        student_id UUID,
        student_email TEXT,
        sequence INT,
        lesson_id TEXT,
        violation_type TEXT,
        predecessor_failed_seq INT,
        action_taken TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
    ) ON COMMIT DROP;

    DELETE FROM temp_sanitization_audit;

    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'OOP PEDAGOGICAL HUB: SEQUENTIAL PROGRESSION SANITIZATION';
    RAISE NOTICE 'Mode: % | Action: % | Sequence Range: % to %',
        CASE WHEN v_dry_run THEN 'DRY-RUN (No changes applied)' ELSE 'APPLYING CHANGES' END,
        v_action, v_min_seq, v_max_seq;
    RAISE NOTICE '================================================================================';

    -- Loop over every student who has at least one record in lesson_progress or users
    FOR r_student IN (
        SELECT DISTINCT u.id AS student_id, u.email, u.name
        FROM users u
        WHERE u.role = 'student'
           OR u.id IN (SELECT DISTINCT student_id FROM lesson_progress WHERE student_id IS NOT NULL)
        ORDER BY u.email
    ) LOOP
        v_total_students := v_total_students + 1;
        v_chain_broken := FALSE;
        v_break_seq := NULL;
        v_break_reason := NULL;

        -- Sequentially evaluate Lesson 1 to Lesson 18
        FOR v_seq IN v_min_seq..v_max_seq LOOP
            -- Find the matching lesson_progress record for this student and sequence
            -- Matches by canonical lesson ID, sequence, or aliases
            SELECT lp.*, COALESCE(l.id, lp.lesson_id) AS resolved_lesson_id
            INTO r_lp
            FROM lesson_progress lp
            LEFT JOIN lessons l ON l.id = lp.lesson_id 
                                OR l.id = 'oop_lesson_' || lp.lesson_id
                                OR l.id = 'swing_lesson_' || lp.lesson_id
                                OR (l.sequence = v_seq AND lp.lesson_id = v_seq::TEXT)
            WHERE lp.student_id = r_student.student_id
              AND (
                  l.sequence = v_seq
                  OR lp.lesson_id = 'oop_lesson_' || v_seq
                  OR lp.lesson_id = 'lesson_' || v_seq
                  OR lp.lesson_id = v_seq::TEXT
                  OR (v_seq > 12 AND lp.lesson_id = 'swing_lesson_' || (v_seq - 12))
              )
            LIMIT 1;

            IF r_lp.id IS NOT NULL THEN
                v_records_inspected := v_records_inspected + 1;
            END IF;

            -- ----------------------------------------------------------------
            -- CASE 1: Predecessor chain was already broken earlier
            -- ----------------------------------------------------------------
            IF v_chain_broken THEN
                -- Any progress or completion on this advanced lesson is an invalid violation!
                IF r_lp.id IS NOT NULL THEN
                    v_records_sanitized := v_records_sanitized + 1;

                    INSERT INTO temp_sanitization_audit (
                        student_id, student_email, sequence, lesson_id,
                        violation_type, predecessor_failed_seq, action_taken
                    ) VALUES (
                        r_student.student_id, r_student.email, v_seq, r_lp.lesson_id,
                        'UNAUTHORIZED_ADVANCED_RECORD: Predecessor Lesson ' || v_break_seq || ' incomplete (' || v_break_reason || ')',
                        v_break_seq,
                        CASE WHEN v_dry_run THEN 'DRY_RUN_PREVIEW' ELSE v_action END
                    );

                    IF NOT v_dry_run THEN
                        IF v_action = 'DELETE' THEN
                            DELETE FROM lesson_progress WHERE id = r_lp.id;
                            v_records_deleted := v_records_deleted + 1;
                        ELSE
                            -- LOCK / REVOKE mode: Lock lesson, strip completion and pass flags
                            UPDATE lesson_progress
                            SET completed = FALSE,
                                completed_at = NULL,
                                video_completed = FALSE,
                                quiz_passed = FALSE,
                                practice_submitted = FALSE,
                                practice_completed = FALSE,
                                updated_at = NOW()
                            WHERE id = r_lp.id;
                        END IF;
                    END IF;
                END IF;

            -- ----------------------------------------------------------------
            -- CASE 2: Predecessor chain is currently intact
            -- ----------------------------------------------------------------
            ELSE
                IF r_lp.id IS NOT NULL THEN
                    -- Check the three strict completion conditions:
                    -- 1. video_completed = TRUE
                    -- 2. quiz_passed = TRUE (or assessment_passed = TRUE)
                    -- 3. practice_submitted = TRUE (or practice_completed = TRUE)
                    v_is_strictly_complete := (
                        COALESCE(r_lp.video_completed, FALSE) = TRUE
                        AND COALESCE(r_lp.quiz_passed, FALSE) = TRUE
                        AND (
                            COALESCE(r_lp.practice_submitted, FALSE) = TRUE
                            OR COALESCE(r_lp.practice_completed, FALSE) = TRUE
                        )
                    );

                    IF v_is_strictly_complete THEN
                        -- Legitimate completion! Ensure completed flag is strictly TRUE
                        v_valid_completions := v_valid_completions + 1;
                        IF NOT v_dry_run AND (r_lp.completed IS NOT TRUE OR r_lp.completed_at IS NULL) THEN
                            UPDATE lesson_progress
                            SET completed = TRUE,
                                completed_at = COALESCE(completed_at, NOW()),
                                updated_at = NOW()
                            WHERE id = r_lp.id;
                        END IF;
                    ELSE
                        -- This lesson does not meet all three completion requirements.
                        -- Chain breaks here! Predecessor for lesson (v_seq + 1) is NOT complete.
                        v_chain_broken := TRUE;
                        v_break_seq := v_seq;
                        v_break_reason := CASE
                            WHEN COALESCE(r_lp.video_completed, FALSE) = FALSE THEN 'video incomplete (<95%)'
                            WHEN COALESCE(r_lp.quiz_passed, FALSE) = FALSE THEN 'assessment failed/not passed (<80%)'
                            ELSE 'practice not submitted'
                        END;

                        -- Ensure completed flag on this incomplete lesson is FALSE
                        IF COALESCE(r_lp.completed, FALSE) = TRUE THEN
                            v_records_sanitized := v_records_sanitized + 1;
                            INSERT INTO temp_sanitization_audit (
                                student_id, student_email, sequence, lesson_id,
                                violation_type, predecessor_failed_seq, action_taken
                            ) VALUES (
                                r_student.student_id, r_student.email, v_seq, r_lp.lesson_id,
                                'FALSE_COMPLETION: Marked completed but missing requirements (' || v_break_reason || ')',
                                v_seq,
                                'REVOKED_COMPLETION'
                            );

                            IF NOT v_dry_run THEN
                                UPDATE lesson_progress
                                SET completed = FALSE,
                                    completed_at = NULL,
                                    updated_at = NOW()
                                WHERE id = r_lp.id;
                            END IF;
                        END IF;
                    END IF;
                ELSE
                    -- No record exists for this sequence.
                    -- The student hasn't reached/completed this lesson yet.
                    -- Therefore, the sequential chain breaks here!
                    v_chain_broken := TRUE;
                    v_break_seq := v_seq;
                    v_break_reason := 'no progress record (not started)';
                END IF;
            END IF;
        END LOOP;

        IF v_chain_broken AND EXISTS (SELECT 1 FROM temp_sanitization_audit WHERE student_id = r_student.student_id) THEN
            v_students_with_violations := v_students_with_violations + 1;
        END IF;
    END LOOP;

    -- ------------------------------------------------------------------------
    -- DIAGNOSTIC AUDIT LOG & SUMMARY
    -- ------------------------------------------------------------------------
    RAISE NOTICE '--------------------------------------------------------------------------------';
    RAISE NOTICE 'AUDIT LOG (SAMPLE OF SANITIZED RECORDS):';
    RAISE NOTICE '--------------------------------------------------------------------------------';
    FOR r_student IN (
        SELECT student_email, sequence, lesson_id, violation_type, action_taken
        FROM temp_sanitization_audit
        ORDER BY student_email, sequence
        LIMIT 50
    ) LOOP
        RAISE NOTICE 'Student: % | Seq: % | Lesson: % | Action: % | Reason: %',
            r_student.student_email, r_student.sequence, r_student.lesson_id,
            r_student.action_taken, r_student.violation_type;
    END LOOP;

    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'PROGRESSION SANITIZATION SUMMARY';
    RAISE NOTICE '================================================================================';
    RAISE NOTICE 'Total Students Evaluated       : %', v_total_students;
    RAISE NOTICE 'Students With Violations       : %', v_students_with_violations;
    RAISE NOTICE 'Total Progress Rows Inspected  : %', v_records_inspected;
    RAISE NOTICE 'Legitimate Completed Records   : %', v_valid_completions;
    RAISE NOTICE 'Out-of-Sequence Rows Sanitized : %', v_records_sanitized;
    IF v_action = 'DELETE' AND NOT v_dry_run THEN
        RAISE NOTICE 'Out-of-Sequence Rows Deleted   : %', v_records_deleted;
    END IF;
    RAISE NOTICE 'Status                         : %',
        CASE WHEN v_dry_run THEN 'DRY-RUN COMPLETED (No modifications made)'
             ELSE 'SANITIZATION COMMITTED SUCCESSFULLY' END;
    RAISE NOTICE '================================================================================';
END $$;
