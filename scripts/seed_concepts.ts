import { createClient } from '@supabase/supabase-js'
import OpenAI from 'openai'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const openaiApiKey = process.env.OPENAI_API_KEY!

if (!supabaseUrl || !supabaseServiceKey || !openaiApiKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)
const openai = new OpenAI({ apiKey: openaiApiKey })

interface Concept {
  id: string
  subject: string
  category: string
  name: string
  definition: string
  common_mistakes: string[]
  recognition_cues: string[]
  pattern_template: string[]
  related_points: string[]
  difficulty: number
  frequency: number
  ai_hint: string
  example: string
  example_translation: string
  textbook_ref: string
  cefr_level: string
  tags: string[]
  alias: string[]
}

interface ConceptEdge {
  src_id: string
  dst_id: string
  relation: string
  weight: number
}

async function generateEmbedding(text: string): Promise<number[]> {
  const maxRetries = 3
  let delay = 100

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: text,
      })
      
      return response.data[0].embedding
    } catch (error) {
      console.warn(`Embedding attempt ${attempt} failed:`, error)
      
      if (attempt === maxRetries) {
        throw error
      }
      
      await new Promise(resolve => setTimeout(resolve, delay))
      delay *= 2
    }
  }
  
  throw new Error('Max retries exceeded')
}

function createIndexText(concept: Concept): string {
  const parts = [
    concept.name,
    concept.definition,
    concept.ai_hint,
    concept.example,
    concept.recognition_cues.join(' '),
    concept.pattern_template.join(' '),
    concept.tags.join(' '),
    concept.alias.join(' ')
  ]
  
  return parts.filter(Boolean).join('\n')
}

async function seedConcepts() {
  try {
    console.log('Starting concept seeding...')
    
    // Read JSON files
    const conceptsPath = path.join(process.cwd(), 'data', 'english_concepts.json')
    const edgesPath = path.join(process.cwd(), 'data', 'concept_edges.json')
    
    const conceptsData = JSON.parse(fs.readFileSync(conceptsPath, 'utf8')) as Concept[]
    const edgesData = JSON.parse(fs.readFileSync(edgesPath, 'utf8')) as ConceptEdge[]
    
    console.log(`Found ${conceptsData.length} concepts and ${edgesData.length} edges`)
    
    // Process concepts with embeddings
    let successCount = 0
    let errorCount = 0
    
    for (const concept of conceptsData) {
      try {
        console.log(`Processing concept: ${concept.name}`)
        
        // Generate embedding
        const indexText = createIndexText(concept)
        const embedding = await generateEmbedding(indexText)
        
        // Upsert concept
        const { error } = await supabase
          .from('concepts')
          .upsert({
            ...concept,
            embedding,
            common_mistakes: concept.common_mistakes,
            recognition_cues: concept.recognition_cues,
            pattern_template: concept.pattern_template,
            related_points: concept.related_points,
            tags: concept.tags,
            alias: concept.alias
          }, { 
            onConflict: 'id' 
          })
        
        if (error) {
          console.error(`Error upserting concept ${concept.id}:`, error)
          errorCount++
        } else {
          successCount++
          console.log(`✓ Successfully upserted: ${concept.name}`)
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200))
        
      } catch (error) {
        console.error(`Error processing concept ${concept.name}:`, error)
        errorCount++
      }
    }
    
    // Process edges
    console.log('Processing concept edges...')
    let edgeSuccessCount = 0
    let edgeErrorCount = 0
    
    for (const edge of edgesData) {
      try {
        const { error } = await supabase
          .from('concept_edges')
          .upsert(edge, { 
            onConflict: 'src_id,dst_id,relation' 
          })
        
        if (error) {
          console.error(`Error upserting edge ${edge.src_id} -> ${edge.dst_id}:`, error)
          edgeErrorCount++
        } else {
          edgeSuccessCount++
        }
      } catch (error) {
        console.error(`Error processing edge ${edge.src_id} -> ${edge.dst_id}:`, error)
        edgeErrorCount++
      }
    }
    
    console.log('\n=== Seeding Summary ===')
    console.log(`Concepts: ${successCount} successful, ${errorCount} errors`)
    console.log(`Edges: ${edgeSuccessCount} successful, ${edgeErrorCount} errors`)
    
    if (errorCount === 0 && edgeErrorCount === 0) {
      console.log('✓ All data seeded successfully!')
    } else {
      console.log('⚠ Some errors occurred during seeding')
    }
    
  } catch (error) {
    console.error('Fatal error during seeding:', error)
    process.exit(1)
  }
}

seedConcepts()
