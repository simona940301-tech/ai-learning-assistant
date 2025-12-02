-- ============================================
-- SEED TEST PACKS AND QUESTIONS FOR ERROR BOOK TESTING
-- ============================================
-- This file creates minimal test data for Phase 8.5 testing
-- Run this in Supabase SQL Editor after migrations are applied

-- 1. Create test pack (English Reading)
-- Store the generated pack_id in a variable for later use
DO $$
DECLARE
    pack_id UUID;
    chapter_id UUID;
    cleaned_packs INTEGER := 0;
BEGIN
    -- Clean up existing test pack data to keep the script idempotent
    DELETE FROM packs
    WHERE title = 'English Reading Test Pack';

    GET DIAGNOSTICS cleaned_packs = ROW_COUNT;

    IF cleaned_packs > 0 THEN
        RAISE NOTICE 'Removed % existing test pack(s) (cascade deleted chapters/questions/error book rows).', cleaned_packs;
    ELSE
        RAISE NOTICE 'No existing test pack found, seeding fresh data.';
    END IF;

    -- Create test pack and get its ID
    INSERT INTO packs (
      title,
      description,
      subject,
      topic,
      skill,
      grade,
      item_count,
      has_explanation,
      explanation_rate,
      avg_confidence,
      status,
      published_at,
      created_by
    ) VALUES (
      'English Reading Test Pack',
      'Minimal test pack for error book testing',
      'english',
      'reading',
      'comprehension',
      'high_school',
      1,
      true,
      1.0,
      0.8,
      'published',
      NOW(),
      'e770f9cd-52a7-43de-b983-70f6f78d2f53' -- Dev user
    ) RETURNING id INTO pack_id;

    RAISE NOTICE 'Created pack with ID: %', pack_id;

    -- Create test chapter
    INSERT INTO pack_chapters (
      pack_id,
      title,
      description,
      "order",
      item_count
    ) VALUES (
      pack_id,
      'Test Chapter 1',
      'Minimal test chapter',
      1,
      1
    ) RETURNING id INTO chapter_id;

    RAISE NOTICE 'Created chapter with ID: %', chapter_id;

    -- Create test question
    INSERT INTO pack_questions (
      pack_id,
      chapter_id,
      stem,
      choices,
      answer,
      explanation,
      difficulty,
      has_explanation,
      confidence,
      "order"
    ) VALUES (
      pack_id,
      chapter_id,
      'The Taiwanese national health insurance (NHI) scheme is ranked one of the best in the world. In 1995, the system was (1) in Taiwan, a small island with a population of roughly 23 million. What does (1) most likely refer to?',
      ARRAY['adopted', 'identified', 'improved', 'strengthened'],
      'A',
      'The context discusses the establishment of the NHI system in 1995, so "adopted" is the most appropriate term meaning "put into practice" or "established" in this healthcare context.',
      'medium',
      true,
      0.8,
      1
    );

    RAISE NOTICE 'Created question for pack: %', pack_id;
END $$;

-- Verify the data was inserted
-- Check if our test pack was created
SELECT
  'Test pack found:' as status,
  COUNT(*) as pack_count,
  array_agg(title) as pack_titles
FROM packs
WHERE title = 'English Reading Test Pack';

-- Check if questions were created for our test pack
SELECT
  'Questions created:' as status,
  COUNT(pq.id) as question_count,
  array_agg(pq.id) as question_ids
FROM pack_questions pq
JOIN packs p ON pq.pack_id = p.id
WHERE p.title = 'English Reading Test Pack';

-- Show the actual test question (for manual verification)
SELECT
  'Test question details:' as status,
  pq.id as question_id,
  pq.stem,
  pq.choices,
  pq.answer,
  pq.explanation,
  p.title as pack_title
FROM pack_questions pq
JOIN packs p ON pq.pack_id = p.id
WHERE p.title = 'English Reading Test Pack';
