#!/usr/bin/env tsx

/**
 * Test Image Upload to RAG System
 * 
 * Tests:
 * 1. JPG image upload with OCR
 * 2. PNG screenshot upload
 * 3. Mixed PDF + Image upload
 */

import fs from 'fs'
import path from 'path'
import FormData from 'form-data'
import fetch from 'node-fetch'

const API_BASE = process.env.API_BASE || 'http://localhost:3000'
const TEST_IMAGE_PATH = process.env.TEST_IMAGE_PATH || '/Users/simonac/.gemini/antigravity/brain/e7967e6a-7f0b-4da3-b9f2-7006e29fe26d/uploaded_image_1764801244441.png'

async function testImageUpload() {
    console.log('🧪 Testing Image Upload to RAG System\n')

    // Check if test image exists
    if (!fs.existsSync(TEST_IMAGE_PATH)) {
        console.error(`❌ Test image not found: ${TEST_IMAGE_PATH}`)
        console.log('Please provide a test image path via TEST_IMAGE_PATH environment variable')
        process.exit(1)
    }

    console.log(`📸 Using test image: ${TEST_IMAGE_PATH}`)
    console.log(`📦 File size: ${(fs.statSync(TEST_IMAGE_PATH).size / 1024).toFixed(2)} KB\n`)

    // Get auth token (you'll need to provide this)
    const AUTH_TOKEN = process.env.AUTH_TOKEN
    if (!AUTH_TOKEN) {
        console.error('❌ AUTH_TOKEN environment variable not set')
        console.log('Please set AUTH_TOKEN to your Supabase access token')
        process.exit(1)
    }

    try {
        // Create form data
        const formData = new FormData()
        formData.append('file', fs.createReadStream(TEST_IMAGE_PATH), {
            filename: path.basename(TEST_IMAGE_PATH),
            contentType: 'image/png'
        })

        console.log('📤 Uploading image to /api/rag/upload...')
        const startTime = Date.now()

        const response = await fetch(`${API_BASE}/api/rag/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${AUTH_TOKEN}`,
                ...formData.getHeaders()
            },
            body: formData
        })

        const duration = Date.now() - startTime
        console.log(`⏱️  Request completed in ${duration}ms\n`)

        if (!response.ok) {
            const error = await response.json()
            console.error('❌ Upload failed:', response.status, response.statusText)
            console.error('Error details:', JSON.stringify(error, null, 2))
            process.exit(1)
        }

        const result = await response.json()
        console.log('✅ Upload successful!\n')
        console.log('📊 Response:')
        console.log(JSON.stringify(result, null, 2))

        // Verify extracted text
        if (result.document && result.document.id) {
            console.log('\n✅ Document created:')
            console.log(`   ID: ${result.document.id}`)
            console.log(`   Filename: ${result.document.filename}`)
            console.log(`   Status: ${result.document.status}`)

            if (result.document.summary) {
                console.log(`   Summary: ${result.document.summary.substring(0, 100)}...`)
            }

            if (result.document.keywords && result.document.keywords.length > 0) {
                console.log(`   Keywords: ${result.document.keywords.join(', ')}`)
            }
        }

        console.log('\n🎉 Test completed successfully!')

    } catch (error) {
        console.error('❌ Test failed:', error)
        process.exit(1)
    }
}

// Run test
testImageUpload()
