-- ═══════════════════════════════════════════════════════════════════════════════
-- DEMO SCHOOL — "Ashford Grammar"
--
-- A complete, self-contained fictional school for sales demos and for proving
-- multi-school isolation actually works. Everything here is invented: no real
-- students, no real staff, no real school. Deliberately different colours
-- (deep green / gold vs Ridgemont's blue) and a different city (Cape Town) so
-- any branding or weather leak between schools is immediately obvious on screen.
--
-- Safe to run more than once — it clears and rebuilds only its own school id,
-- and never touches any other school's data.
--
-- To remove it entirely later:
--   DELETE FROM schools WHERE id = '00000000-0000-0000-0000-0000000000d0';
--   (every child row cascades)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  demo_id uuid := '00000000-0000-0000-0000-0000000000d0';
BEGIN

-- ── Clean rerun: remove any previous demo data (this school only) ────────────
DELETE FROM workout_logs              WHERE school_id = demo_id;
DELETE FROM workout_program_exercises WHERE school_id = demo_id;
DELETE FROM workout_programs          WHERE school_id = demo_id;
DELETE FROM gym_checkins              WHERE school_id = demo_id;
DELETE FROM coach_notes               WHERE school_id = demo_id;
DELETE FROM performance_tests         WHERE school_id = demo_id;
DELETE FROM attendance                WHERE school_id = demo_id;
DELETE FROM athlete_sports            WHERE school_id = demo_id;
DELETE FROM hp_test_results           WHERE school_id = demo_id;
DELETE FROM hp_attendance             WHERE school_id = demo_id;
DELETE FROM hp_students               WHERE school_id = demo_id;
DELETE FROM athletes                  WHERE school_id = demo_id;
DELETE FROM portal_week_plan_items    WHERE school_id = demo_id;
DELETE FROM portal_week_plans         WHERE school_id = demo_id;
DELETE FROM portal_fixtures           WHERE school_id = demo_id;
DELETE FROM portal_results            WHERE school_id = demo_id;
DELETE FROM portal_reminders          WHERE school_id = demo_id;
DELETE FROM portal_programs           WHERE school_id = demo_id;
DELETE FROM portal_sponsors           WHERE school_id = demo_id;
DELETE FROM portal_spotlight          WHERE school_id = demo_id;
DELETE FROM school_sports             WHERE school_id = demo_id;
DELETE FROM hp_access_codes           WHERE school_id = demo_id;
DELETE FROM portal_access_codes       WHERE school_id = demo_id;
DELETE FROM staff_roles               WHERE school_id = demo_id;

-- ── The school itself ────────────────────────────────────────────────────────
INSERT INTO schools (id, name, short_name, abbreviation, logo_url, primary_color, accent_color, slug, latitude, longitude, is_active)
VALUES (demo_id, 'Ashford Grammar', 'Ashford', 'AG', '/school-logo.png', '#0f766e', '#eab308', 'ashford', -33.9249, 18.4241, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, short_name = EXCLUDED.short_name, abbreviation = EXCLUDED.abbreviation,
  primary_color = EXCLUDED.primary_color, accent_color = EXCLUDED.accent_color,
  latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude, is_active = true;

-- ── Sports: deliberately a DIFFERENT set to Ridgemont's, so demos show that
--    the sport list really is per-school ───────────────────────────────────────
INSERT INTO school_sports (school_id, sport_key, sort_order) VALUES
  (demo_id, 'rugby', 1), (demo_id, 'cricket', 2), (demo_id, 'hockey', 3), (demo_id, 'swimming', 4);

-- ── Access codes ─────────────────────────────────────────────────────────────
INSERT INTO hp_access_codes (school_id, code, role, is_active) VALUES
  (demo_id, 'AGHP-DEMO24', 'hp-coach', true),
  (demo_id, 'AGADM-DEMO24', 'hp-admin', true);

-- portal_access_codes stores codes hashed, never in plain text. The login
-- route lowercases before hashing, so these are the sha256 of the lowercased
-- code. The human-readable codes are:
--   rugby AGRUG-DEMO · cricket AGCRI-DEMO · hockey AGHOC-DEMO · swimming AGSWI-DEMO
INSERT INTO portal_access_codes (school_id, sport, code_hash) VALUES
  (demo_id, 'rugby',    encode(digest(lower('AGRUG-DEMO'), 'sha256'), 'hex')),
  (demo_id, 'cricket',  encode(digest(lower('AGCRI-DEMO'), 'sha256'), 'hex')),
  (demo_id, 'hockey',   encode(digest(lower('AGHOC-DEMO'), 'sha256'), 'hex')),
  (demo_id, 'swimming', encode(digest(lower('AGSWI-DEMO'), 'sha256'), 'hex'));

-- ── Athletes: 24 across four rugby teams ─────────────────────────────────────
INSERT INTO athletes (school_id, full_name, first_name, last_name, team, age_group, position, availability, is_active, sport)
SELECT demo_id, fn || ' ' || ln, fn, ln, team, age, pos, 'Available', true, 'rugby'
FROM (VALUES
  ('Thomas','Bramley','1st XV','U18','Fly-half'),   ('Sipho','Ndlovu','1st XV','U18','Scrum-half'),
  ('Callum','Whitfield','1st XV','U18','Lock'),      ('Riaan','Steenkamp','1st XV','U18','Prop'),
  ('Joshua','Adeyemi','1st XV','U18','Winger'),      ('Marco','Delport','1st XV','U18','Centre'),
  ('Ethan','Kirsten','1st XV','U18','Fullback'),     ('Luthando','Mbeki','1st XV','U18','Flanker'),
  ('Daniel','Prinsloo','2nd XV','U18','Hooker'),     ('Kegan','Roberts','2nd XV','U18','Lock'),
  ('Sizwe','Dlamini','2nd XV','U18','Winger'),       ('Bradley','Fourie','2nd XV','U18','Centre'),
  ('Aiden','Naicker','2nd XV','U18','Prop'),         ('Tumelo','Mahlangu','2nd XV','U18','Flanker'),
  ('Jack','Sinclair','U16A','U16','Fly-half'),       ('Reece','Botha','U16A','U16','Scrum-half'),
  ('Nkosi','Zulu','U16A','U16','Lock'),              ('Owen','Harrison','U16A','U16','Winger'),
  ('Kyle','Meyer','U16A','U16','Centre'),            ('Tariq','Isaacs','U16A','U16','Prop'),
  ('Liam','Carstens','U14A','U14','Fly-half'),       ('Bongani','Khumalo','U14A','U14','Winger'),
  ('Ryan','Oosthuizen','U14A','U14','Lock'),         ('Ashwin','Pillay','U14A','U14','Centre')
) AS t(fn, ln, team, age, pos);

-- ── Fixtures: a realistic mix of past and upcoming ───────────────────────────
INSERT INTO portal_fixtures (school_id, team, opponent, fixture_date, fixture_time, venue, home_away, is_published, sort_order, sport, coach)
VALUES
  (demo_id, '1st XV', 'Bishops College',    CURRENT_DATE + 3,  '14:30', 'Ashford Main Field', 'home', true, 1, 'rugby', 'Mr D. Kruger'),
  (demo_id, '2nd XV', 'Bishops College',    CURRENT_DATE + 3,  '13:00', 'Ashford Main Field', 'home', true, 2, 'rugby', 'Mr P. Naidoo'),
  (demo_id, 'U16A',   'Bishops College',    CURRENT_DATE + 3,  '11:30', 'Ashford B Field',    'home', true, 3, 'rugby', 'Mr S. Botha'),
  (demo_id, '1st XV', 'Rondebosch High',    CURRENT_DATE + 10, '15:00', 'Rondebosch',         'away', true, 4, 'rugby', 'Mr D. Kruger'),
  (demo_id, 'U14A',   'Wynberg Prep',       CURRENT_DATE + 12, '10:00', 'Ashford B Field',    'home', true, 5, 'rugby', 'Mr T. Fisher'),
  (demo_id, '1st XV', 'Paarl Gimnasium',    CURRENT_DATE + 17, '14:30', 'Ashford Main Field', 'home', true, 6, 'rugby', 'Mr D. Kruger');

-- ── Results: recent form, with a mix of wins and losses ──────────────────────
INSERT INTO portal_results (school_id, team, opponent, result_date, final_score, goal_scorers, is_published, sort_order)
VALUES
  (demo_id, '1st XV', 'Somerset College',  CURRENT_DATE - 4,  '27-19', 'T. Bramley (2T), J. Adeyemi (T), E. Kirsten (2C, 1P)', true, 1),
  (demo_id, '2nd XV', 'Somerset College',  CURRENT_DATE - 4,  '15-22', 'S. Dlamini (T), D. Prinsloo (T), B. Fourie (C)',       true, 2),
  (demo_id, 'U16A',   'Somerset College',  CURRENT_DATE - 4,  '31-7',  'J. Sinclair (2T), O. Harrison (T), N. Zulu (T)',       true, 3),
  (demo_id, '1st XV', 'Durbanville High',  CURRENT_DATE - 11, '34-12', 'M. Delport (2T), L. Mbeki (T), C. Whitfield (T)',      true, 4),
  (demo_id, 'U14A',   'Milnerton Prep',    CURRENT_DATE - 11, '19-19', 'L. Carstens (T, 2C), B. Khumalo (T)',                  true, 5);

-- ── Reminders ────────────────────────────────────────────────────────────────
INSERT INTO portal_reminders (school_id, title, details, is_published, sort_order) VALUES
  (demo_id, 'Kit collection — Friday', 'All 1st and 2nd XV players collect match kit from the sports office before 15:00 Friday.', true, 1),
  (demo_id, 'Derby day transport', 'Buses depart at 12:15 sharp for the Rondebosch away fixture. Please be at the quad by 12:00.', true, 2),
  (demo_id, 'Medical forms outstanding', 'A number of U14 medical consent forms are still outstanding — please return them this week.', true, 3);

-- ── Week plan ────────────────────────────────────────────────────────────────
INSERT INTO portal_week_plans (id, school_id, week_label, published)
VALUES ('00000000-0000-0000-0000-0000000000d1', demo_id, 'Week at a Glance', true);

INSERT INTO portal_week_plan_items (school_id, week_plan_id, day_label, title, details, sort_order) VALUES
  (demo_id, '00000000-0000-0000-0000-0000000000d1', 'Monday',    'Recovery & Analysis', 'Pool recovery 07:00. Match review in the media room 15:30.', 1),
  (demo_id, '00000000-0000-0000-0000-0000000000d1', 'Tuesday',   'Full Contact',        'Forwards 15:00, backs 15:45, full team run 16:30.',        2),
  (demo_id, '00000000-0000-0000-0000-0000000000d1', 'Wednesday', 'Strength & Speed',    'Gym session by age group — see programme.',                 3),
  (demo_id, '00000000-0000-0000-0000-0000000000d1', 'Thursday',  'Captain''s Run',      'Light run-through, set pieces, kicking practice 15:00.',    4),
  (demo_id, '00000000-0000-0000-0000-0000000000d1', 'Friday',    'Match Day',           'Home fixtures vs Bishops College from 11:30.',              5);

-- ── HP students: a small squad with a spread of ability ──────────────────────
INSERT INTO hp_students (school_id, full_name, grade, class_group, is_active)
SELECT demo_id, fn, gr, cg, true
FROM (VALUES
  ('Thomas Bramley','Grade 9','A'),  ('Sipho Ndlovu','Grade 9','A'),
  ('Callum Whitfield','Grade 9','A'),('Riaan Steenkamp','Grade 9','B'),
  ('Joshua Adeyemi','Grade 9','B'),  ('Marco Delport','Grade 9','B'),
  ('Jack Sinclair','Grade 8','A'),   ('Reece Botha','Grade 8','A'),
  ('Nkosi Zulu','Grade 8','A'),      ('Owen Harrison','Grade 8','B'),
  ('Kyle Meyer','Grade 8','B'),      ('Tariq Isaacs','Grade 8','B')
) AS t(fn, gr, cg);

-- ── Workout programme ────────────────────────────────────────────────────────
INSERT INTO workout_programs (id, school_id, title, age_category, sport, is_active, sort_order)
VALUES ('00000000-0000-0000-0000-0000000000d2', demo_id, 'Pre-Season Strength — Seniors', 'senior', 'rugby', true, 1);

INSERT INTO workout_program_exercises (school_id, program_id, name, target_sets, target_reps, sort_order) VALUES
  (demo_id, '00000000-0000-0000-0000-0000000000d2', 'Back Squat',      4, '6-8',   1),
  (demo_id, '00000000-0000-0000-0000-0000000000d2', 'Bench Press',     4, '6-8',   2),
  (demo_id, '00000000-0000-0000-0000-0000000000d2', 'Romanian Deadlift',3,'8-10',  3),
  (demo_id, '00000000-0000-0000-0000-0000000000d2', 'Weighted Chin-up',3, '5-8',   4),
  (demo_id, '00000000-0000-0000-0000-0000000000d2', 'Farmer''s Carry', 3, '40m',   5);

-- ── Sponsors ─────────────────────────────────────────────────────────────────
INSERT INTO portal_sponsors (school_id, name, sponsor_link, is_published, sort_order) VALUES
  (demo_id, 'Table Mountain Outfitters', 'https://example.com', true, 1),
  (demo_id, 'Cape Physio Group',         'https://example.com', true, 2);

END $$;

NOTIFY pgrst, 'reload schema';

-- ── VERIFY ────────────────────────────────────────────────────────────────────
SELECT
  s.name AS school, s.slug, s.primary_color,
  (SELECT count(*) FROM athletes        WHERE school_id = s.id) AS athletes,
  (SELECT count(*) FROM hp_students     WHERE school_id = s.id) AS hp_students,
  (SELECT count(*) FROM portal_fixtures WHERE school_id = s.id) AS fixtures,
  (SELECT count(*) FROM portal_results  WHERE school_id = s.id) AS results,
  (SELECT count(*) FROM school_sports   WHERE school_id = s.id) AS sports
FROM schools s
ORDER BY s.created_at;
