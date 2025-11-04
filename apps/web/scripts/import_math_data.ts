import { createClient } from '@supabase/supabase-js'
import fs from 'node:fs'
import path from 'path'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function upsertSubjects() {
  console.log('Creating subjects...')
  const { error } = await supabase
    .from('subjects')
    .upsert([
      { name: 'MathA' },
      { name: 'English' }
    ], { onConflict: 'name' })
  
  if (error) {
    console.error('Error creating subjects:', error)
    throw error
  }
  console.log('✓ Subjects created')
}

async function upsertKeypoints(jsonlPath: string) {
  console.log('Importing keypoints...')
  const rows = fs.readFileSync(jsonlPath, 'utf-8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  
  // Get subject ID
  const { data: subjectData, error: subjError } = await supabase
    .from('subjects')
    .select('id')
    .eq('name', 'MathA')
    .single()
  
  if (subjError) {
    console.error('Error finding MathA subject:', subjError)
    throw subjError
  }
  if (!subjectData) {
    const notFound = new Error('MathA subject not found')
    console.error('Error finding MathA subject:', notFound)
    throw notFound
  }
  const subject = subjectData

  // Transform and upsert keypoints
  const payload = rows.map((r: any) => ({
    subject_id: subject.id,
    category: r.category,
    code: r.code,
    name: r.name,
    description: r.description,
    strategy_template: r.strategy_template,
    error_patterns: r.error_patterns
  }))

  const { error } = await supabase
    .from('keypoints')
    .upsert(payload, { onConflict: 'subject_id,code' })

  if (error) {
    console.error('Error upserting keypoints:', error)
    throw error
  }

  console.log(`✓ Imported ${payload.length} keypoints`)
}

async function upsertQuestions(jsonlPath: string) {
  console.log('Importing questions...')
  const rows = fs.readFileSync(jsonlPath, 'utf-8')
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line))
  
  // Get subject ID
  const { data: subjectData, error: subjError } = await supabase
    .from('subjects')
    .select('id')
    .eq('name', 'MathA')
    .single()
  
  if (subjError) {
    console.error('Error finding MathA subject:', subjError)
    throw subjError
  }
  if (!subjectData) {
    const notFound = new Error('MathA subject not found')
    console.error('Error finding MathA subject:', notFound)
    throw notFound
  }
  const subject = subjectData

  const examsCache = new Map<string, string>()

  async function getExamId(year: number, label: string) {
    const key = `${year}-${label}`
    if (examsCache.has(key)) return examsCache.get(key)!
    
    let { data, error } = await supabase
      .from('exams')
      .select('id')
      .eq('subject_id', subject.id)
      .eq('year', year)
      .eq('label', label)
      .maybeSingle()
    
    if (!data && !error) {
      const { data: newExam, error: insertError } = await supabase
        .from('exams')
        .insert({ subject_id: subject.id, year, label })
        .select('id')
        .single()
      
      if (insertError) throw insertError
      data = newExam
    }
    
    if (error) throw error
    examsCache.set(key, data!.id)
    return data!.id
  }

  // Get all keypoints for mapping
  const { data: allKeypoints, error: kpError } = await supabase
    .from('keypoints')
    .select('id, code')
    .eq('subject_id', subject.id)
  
  if (kpError) throw kpError
  
  const keypointMap = new Map(allKeypoints!.map(k => [k.code, k.id]))

  let successCount = 0
  let errorCount = 0

  for (const row of rows) {
    try {
      const { keypoints, exam, ...questionData } = row
      
      // Get or create exam
      const exam_id = await getExamId(exam.year, exam.label)
      
      // Upsert question
      const { data: question, error: qError } = await supabase
        .from('questions')
        .upsert({ ...questionData, exam_id }, { 
          onConflict: 'exam_id,number' 
        })
        .select('id')
        .single()
      
      if (qError) {
        console.error(`Error upserting question ${exam.year}-${exam.label}-${questionData.number}:`, qError)
        errorCount++
        continue
      }

      // Insert question-keypoint relationships
      if (keypoints && keypoints.length > 0) {
        const qkRows = keypoints.map((kp: any) => ({
          question_id: question.id,
          keypoint_id: keypointMap.get(kp.code),
          role: kp.role,
          weight: kp.weight ?? 1.0
        })).filter((row: any) => row.keypoint_id)

        if (qkRows.length > 0) {
          const { error: qkError } = await supabase
            .from('question_keypoints')
            .upsert(qkRows, { 
              onConflict: 'question_id,keypoint_id,role' 
            })
          
          if (qkError) {
            console.error(`Error inserting question-keypoint relationships for question ${question.id}:`, qkError)
          }
        }
      }

      successCount++
    } catch (error) {
      console.error(`Error processing question:`, error)
      errorCount++
    }
  }

  console.log(`✓ Imported ${successCount} questions (${errorCount} errors)`)
}

async function generateKeypointMCQs() {
  console.log('Generating keypoint MCQs...')
  
  // Get MathA subject and keypoints
  const { data: subject } = await supabase
    .from('subjects')
    .select('id')
    .eq('name', 'MathA')
    .single()

  const { data: keypoints } = await supabase
    .from('keypoints')
    .select('*')
    .eq('subject_id', subject!.id)

  if (!keypoints || keypoints.length < 4) {
    console.log('Not enough keypoints to generate MCQs')
    return
  }

  const mcqs = []

  // Generate MCQs for each keypoint
  for (const primaryKp of keypoints) {
    // Find similar keypoints for distractors
    const sameCategory = keypoints.filter(kp => 
      kp.category === primaryKp.category && kp.id !== primaryKp.id
    )
    
    const differentCategory = keypoints.filter(kp => 
      kp.category !== primaryKp.category && kp.id !== primaryKp.id
    )

    // Select 3 distractors
    const distractors = []
    
    // Add 2 from same category
    if (sameCategory.length >= 2) {
      distractors.push(...sameCategory.slice(0, 2))
    } else if (sameCategory.length === 1) {
      distractors.push(sameCategory[0])
    }
    
    // Add 1 from different category
    if (distractors.length < 3 && differentCategory.length > 0) {
      distractors.push(differentCategory[0])
    }

    if (distractors.length >= 3) {
      // Generate MCQ
      const choices = [
        {
          key: 'A',
          text: primaryKp.description,
          isCorrect: true
        },
        ...distractors.slice(0, 3).map((kp, i) => ({
          key: String.fromCharCode(66 + i), // B, C, D
          text: generateDistractorText(kp, primaryKp),
          isCorrect: false
        }))
      ].sort(() => Math.random() - 0.5) // Shuffle

      const correctAnswer = choices.find(c => c.isCorrect)!.key

      mcqs.push({
        subject_id: subject!.id,
        stem: `以下哪一個是「${primaryKp.name}」的正確敘述？`,
        choices: choices.map(c => ({ key: c.key, text: c.text })),
        answer: correctAnswer,
        keyed_keypoint_id: primaryKp.id,
        difficulty: '中',
        tags: [primaryKp.category]
      })
    }
  }

  if (mcqs.length > 0) {
    const { error } = await supabase
      .from('keypoint_mcq_bank')
      .insert(mcqs)

    if (error) {
      console.error('Error inserting MCQs:', error)
    } else {
      console.log(`✓ Generated ${mcqs.length} keypoint MCQs`)
    }
  }
}

function generateDistractorText(keypoint: any, primaryKeypoint: any) {
  // Generate misleading description based on error patterns
  const errorPattern = keypoint.error_patterns?.[0]
  if (errorPattern) {
    return `${keypoint.description}（注意：${errorPattern.note}）`
  }
  
  // Mix up with primary keypoint's description
  if (primaryKeypoint.error_patterns?.[0]) {
    return `${keypoint.description}（常見錯誤：${primaryKeypoint.error_patterns[0].pattern}）`
  }
  
  return keypoint.description
}

async function main() {
  try {
    await upsertSubjects()
    
    const keypointsPath = path.join(process.cwd(), 'data', 'mathA_keypoints.jsonl')
    const questionsPath = path.join(process.cwd(), 'data', 'mathA_questions_sample.jsonl')
    
    await upsertKeypoints(keypointsPath)
    await upsertQuestions(questionsPath)
    await generateKeypointMCQs()
    
    console.log('\n🎉 MathA data import completed successfully!')
  } catch (error) {
    console.error('Import failed:', error)
    process.exit(1)
  }
}

main()
