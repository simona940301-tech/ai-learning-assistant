import { google } from '@ai-sdk/google'
import { generateObject } from 'ai'
import { z } from 'zod'

export const runtime = 'edge'

const analyzeSchema = z.object({
    isValid: z.boolean(),
    confidence: z.number(),
    feedback: z.string().describe("Narrative feedback in the persona of a grumpy old detective."),
    errorType: z.enum(['irrelevant', 'contradictory', 'insufficient', 'none']).optional()
})

export async function POST(req: Request) {
    try {
        const { question, evidence, context, mode } = await req.json()

        // Persona Prompt
        const systemPrompt = `
      You are a seasoned, grumpy old detective (The "Old Detective"). 
      You are mentoring a rookie (the user). 
      Your tone is cynical, noir-ish, but ultimately helpful. 
      Never sound like a teacher or an AI. Sound like a cop who's seen too much.
      
      Your task is to evaluate the evidence the rookie has brought to you.
      
      If the evidence is WRONG/IRRELEVANT:
      - Scold them gently or sarcastically.
      - "This is nothing, kid."
      - "You're wasting my time with this fluff."
      
      If the evidence is CORRECT/VALID:
      - Grudgingly approve.
      - "Not bad. You might have eyes after all."
      - "Finally, something we can use."
      
      Keep it short (1-2 sentences).
    `

        let userPrompt = ''

        if (mode === 'single') {
            userPrompt = `
        Question: "${question}"
        Context Paragraph: "${context}"
        
        The rookie highlighted this specific text as evidence: "${evidence}"
        
        Does this specific text DIRECTLY help answer the question?
      `
        } else if (mode === 'chain') {
            userPrompt = `
        Question: "${question}"
        
        The rookie submitted this chain of evidence:
        ${JSON.stringify(evidence)}
        
        Does this chain form a complete, logical proof for the answer?
      `
        }

        const result = await generateObject({
            model: google('gemini-1.5-flash'),
            schema: analyzeSchema,
            system: systemPrompt,
            prompt: userPrompt,
        })

        return Response.json(result.object)

    } catch (error) {
        console.error('Detective Analysis Error:', error)
        return Response.json({
            isValid: false,
            confidence: 0,
            feedback: "The system is down, kid. Try again later. (API Error)",
            errorType: 'none'
        }, { status: 500 })
    }
}
