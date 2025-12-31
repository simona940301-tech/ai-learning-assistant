import { GoogleGenerativeAI } from '@google/generative-ai'
import { GoogleAIFileManager, FileState } from '@google/generative-ai/server'

const apiKey = process.env.GEMINI_API_KEY || ''
const fileManager = new GoogleAIFileManager(apiKey)
const genAI = new GoogleGenerativeAI(apiKey)

const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

interface FileSearchStore {
    name: string
    displayName: string
}

export class GoogleFileSearchService {
    /**
     * Uploads a file to Google File Search (via File API)
     */
    static async uploadFile(path: string, mimeType: string, displayName: string) {
        try {
            const uploadResponse = await fileManager.uploadFile(path, {
                mimeType,
                displayName,
            })
            console.log(`[GoogleFileSearch] Uploaded file ${displayName}: ${uploadResponse.file.name}`)
            return uploadResponse.file
        } catch (error) {
            console.error('[GoogleFileSearch] Upload failed:', error)
            throw error
        }
    }

    /**
     * Waits for a file to be processed
     */
    static async waitForFileActive(name: string) {
        let file = await fileManager.getFile(name)
        while (file.state === FileState.PROCESSING) {
            console.log(`[GoogleFileSearch] Waiting for file ${name} to be active...`)
            await new Promise((resolve) => setTimeout(resolve, 2000))
            file = await fileManager.getFile(name)
        }

        if (file.state === FileState.FAILED) {
            throw new Error(`File processing failed: ${file.error?.message}`)
        }

        console.log(`[GoogleFileSearch] File ${name} is active`)
        return file
    }

    /**
     * Creates a new File Search Store
     */
    static async createStore(displayName: string): Promise<FileSearchStore> {
        const response = await fetch(`${BASE_URL}/fileSearchStores?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ displayName })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`Failed to create store: ${error.error?.message || response.statusText}`)
        }

        return await response.json()
    }

    /**
     * Lists existing File Search Stores
     */
    static async listStores(): Promise<FileSearchStore[]> {
        const response = await fetch(`${BASE_URL}/fileSearchStores?key=${apiKey}`, {
            method: 'GET'
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`Failed to list stores: ${error.error?.message || response.statusText}`)
        }

        const data = await response.json()
        return data.fileSearchStores || []
    }

    /**
     * Gets or creates a store for a specific user
     */
    static async getUserStore(userId: string): Promise<FileSearchStore> {
        const storeName = `user-${userId}`

        // List stores to find if it exists
        const stores = await this.listStores()
        const existingStore = stores.find(s => s.displayName === storeName)

        if (existingStore) {
            console.log(`[GoogleFileSearch] Found existing store for user ${userId}: ${existingStore.name}`)
            return existingStore
        }

        console.log(`[GoogleFileSearch] Creating new store for user ${userId}`)
        return await this.createStore(storeName)
    }

    /**
     * Imports a file into a File Search Store
     */
    static async importFileToStore(storeName: string, fileName: string) {
        // Note: The API endpoint is `fileSearchStores/{storeId}/files` to create a relation
        // But the user example uses `import_file` which might be a high-level SDK method.
        // The REST equivalent is creating a `fileSearchStoreFiles` resource.
        // URL: POST https://generativelanguage.googleapis.com/v1beta/{parent=fileSearchStores/*}/files

        const response = await fetch(`${BASE_URL}/${storeName}/files?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resourceName: fileName })
        })

        if (!response.ok) {
            const error = await response.json()
            throw new Error(`Failed to import file to store: ${error.error?.message || response.statusText}`)
        }

        const data = await response.json()
        console.log(`[GoogleFileSearch] Imported file ${fileName} to store ${storeName}`)
        return data
    }
}
