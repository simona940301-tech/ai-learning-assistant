import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tagQuestion } from '../concept-tagger'

// Mock GoogleGenerativeAI
const mocks = vi.hoisted(() => {
    const generateContent = vi.fn()
    const getGenerativeModel = vi.fn(() => ({
        generateContent: generateContent
    }))
    const GoogleGenerativeAI = vi.fn(() => ({
        getGenerativeModel: getGenerativeModel
    }))
    return {
        GoogleGenerativeAI,
        getGenerativeModel,
        generateContent
    }
})

vi.mock('@google/generative-ai', () => ({
    GoogleGenerativeAI: mocks.GoogleGenerativeAI
}))

describe('Concept Tagger', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        process.env.GEMINI_API_KEY = 'test-key'
    })

    it('should extract tags from question text', async () => {
        mocks.generateContent.mockResolvedValue({
            response: {
                text: () => '{"tags": ["虛擬語氣", "過去完成式"]}'
            }
        })

        const tags = await tagQuestion('If I had known, I would have come.', 'english')

        expect(tags).toEqual(['虛擬語氣', '過去完成式'])
        expect(mocks.generateContent).toHaveBeenCalled()
    })

    it('should handle empty API key gracefully', async () => {
        delete process.env.GEMINI_API_KEY

        const tags = await tagQuestion('test', 'english')
        expect(tags).toEqual([])
    })

    it('should handle invalid JSON response', async () => {
        mocks.generateContent.mockResolvedValue({
            response: {
                text: () => 'Not JSON'
            }
        })

        const tags = await tagQuestion('test', 'english')
        expect(tags).toEqual([])
    })

    it('should use available tags if provided', async () => {
        mocks.generateContent.mockResolvedValue({
            response: {
                text: () => '{"tags": ["Tag A"]}'
            }
        })

        await tagQuestion('test', 'english', ['Tag A', 'Tag B'])

        // Check if prompt included available tags
        const prompt = mocks.generateContent.mock.calls[0][0]
        expect(prompt).toContain('Tag A')
        expect(prompt).toContain('Tag B')
    })
})
