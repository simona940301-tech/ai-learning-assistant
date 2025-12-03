/**
 * Context Cache Service
 * 
 * 頂尖 Gemini 1.5 Pro Context Caching 實作
 * 
 * 功能：
 * - 創建長文件快取（24 小時 TTL）
 * - 減少 API Token 消耗
 * - 加速 Chat 回應（不需重複傳送長文件）
 * 
 * 技術：
 * - Gemini (genAI as any).cacheManager API
 * - 自動 TTL 管理
 * - Session 綁定
 */

import { GoogleGenerativeAI, CachedContent } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Cache TTL: 24 hours (in seconds)
const CACHE_TTL_SECONDS = 24 * 60 * 60;

export interface CacheCreateResult {
    success: boolean;
    cacheName?: string;
    error?: string;
    expiresAt?: Date;
}

export interface CacheGetResult {
    success: boolean;
    cache?: CachedContent;
    error?: string;
}

/**
 * 創建文件內容快取
 * 
 * @param documentId - 文件 ID（用於追蹤）
 * @param content - 文件內容（純文字）
 * @param displayName - 快取顯示名稱
 * @returns CacheCreateResult
 */
export async function createContextCache(
    documentId: string,
    content: string,
    displayName?: string
): Promise<CacheCreateResult> {
    console.log('[ContextCache] 🚀 Creating cache for document:', documentId);
    console.log('[ContextCache] Content length:', content.length, 'characters');

    try {
        // Gemini Context Caching 最小 token 要求：32,768 tokens
        // 粗略估算：1 token ≈ 4 characters（中文約 1.5 字）
        // 最小內容長度約 50,000 characters
        const MIN_CONTENT_LENGTH = 50000;

        if (content.length < MIN_CONTENT_LENGTH) {
            console.log('[ContextCache] ⚠️ Content too short for caching, skipping...');
            return {
                success: false,
                error: `Content too short for caching (${content.length} chars, minimum ${MIN_CONTENT_LENGTH})`
            };
        }

        const (genAI as any).cacheManager = genAI.(genAI as any).cacheManager;

        // 創建快取內容
        const cachedContent = await (genAI as any).cacheManager.create({
            model: 'models/gemini-2.0-flash-exp', // ⚡ 修復：gemini-1.5-pro-latest 已停用，改用 2.0 Flash (Cache 需要穩定模型)
            displayName: displayName || `doc-${documentId}`,
            systemInstruction: {
                role: 'system',
                parts: [{
                    text: `你是一位專業的學術助教，專門協助學生理解以下文件內容。
請根據文件內容回答問題，如果問題與文件無關，請明確告知。

## 文件內容：
${content}`
                }]
            },
            ttlSeconds: CACHE_TTL_SECONDS
        });

        const expiresAt = new Date(Date.now() + CACHE_TTL_SECONDS * 1000);

        console.log('[ContextCache] ✅ Cache created successfully!');
        console.log('[ContextCache] Cache name:', cachedContent.name);
        console.log('[ContextCache] Expires at:', expiresAt.toISOString());

        return {
            success: true,
            cacheName: cachedContent.name,
            expiresAt
        };

    } catch (error) {
        console.error('[ContextCache] ❌ Failed to create cache:', error);
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        // 處理常見錯誤
        if (errorMessage.includes('quota')) {
            return { success: false, error: 'API 配額已用盡' };
        }
        if (errorMessage.includes('too short') || errorMessage.includes('minimum')) {
            return { success: false, error: '文件內容太短，無法快取' };
        }

        return { success: false, error: errorMessage };
    }
}

/**
 * 獲取快取內容
 * 
 * @param cacheName - 快取名稱
 * @returns CacheGetResult
 */
export async function getContextCache(cacheName: string): Promise<CacheGetResult> {
    console.log('[ContextCache] 🔍 Getting cache:', cacheName);

    try {
        const (genAI as any).cacheManager = genAI.(genAI as any).cacheManager;
        const cache = await (genAI as any).cacheManager.get(cacheName);

        if (!cache) {
            console.log('[ContextCache] ⚠️ Cache not found or expired');
            return { success: false, error: 'Cache not found or expired' };
        }

        console.log('[ContextCache] ✅ Cache retrieved:', cache.displayName);
        return { success: true, cache };

    } catch (error) {
        console.error('[ContextCache] ❌ Failed to get cache:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}

/**
 * 刪除快取
 * 
 * @param cacheName - 快取名稱
 */
export async function deleteContextCache(cacheName: string): Promise<boolean> {
    console.log('[ContextCache] 🗑️ Deleting cache:', cacheName);

    try {
        const (genAI as any).cacheManager = genAI.(genAI as any).cacheManager;
        await (genAI as any).cacheManager.delete(cacheName);
        console.log('[ContextCache] ✅ Cache deleted');
        return true;

    } catch (error) {
        console.error('[ContextCache] ❌ Failed to delete cache:', error);
        return false;
    }
}

/**
 * 列出所有快取（用於管理/清理）
 */
export async function listContextCaches(): Promise<CachedContent[]> {
    try {
        const (genAI as any).cacheManager = genAI.(genAI as any).cacheManager;
        const result = await (genAI as any).cacheManager.list();
        return result.cachedContents || [];
    } catch (error) {
        console.error('[ContextCache] ❌ Failed to list caches:', error);
        return [];
    }
}

/**
 * 使用快取生成回應
 * 
 * 這個函數用於 Chat API，使用已快取的 context 進行對話
 * 
 * @param cacheName - 快取名稱
 * @param userMessage - 用戶訊息
 * @param history - 對話歷史
 */
export async function generateWithCache(
    cacheName: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'model'; content: string }> = []
): Promise<{ success: boolean; text?: string; error?: string }> {
    console.log('[ContextCache] 💬 Generating with cache:', cacheName);

    try {
        const (genAI as any).cacheManager = genAI.(genAI as any).cacheManager;
        const cache = await (genAI as any).cacheManager.get(cacheName);

        if (!cache) {
            return { success: false, error: 'Cache not found or expired' };
        }

        // 使用快取的 model
        const model = genAI.getGenerativeModelFromCachedContent(cache);

        // 構建對話歷史
        const chat = model.startChat({
            history: history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            }))
        });

        // 發送訊息並獲取回應
        const result = await chat.sendMessage(userMessage);
        const text = result.response.text();

        console.log('[ContextCache] ✅ Response generated:', text.length, 'chars');

        return { success: true, text };

    } catch (error) {
        console.error('[ContextCache] ❌ Failed to generate with cache:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return { success: false, error: errorMessage };
    }
}

/**
 * 使用快取進行串流生成
 * 
 * @param cacheName - 快取名稱
 * @param userMessage - 用戶訊息
 * @param history - 對話歷史
 */
export async function* streamWithCache(
    cacheName: string,
    userMessage: string,
    history: Array<{ role: 'user' | 'model'; content: string }> = []
): AsyncGenerator<string, void, unknown> {
    console.log('[ContextCache] 🌊 Streaming with cache:', cacheName);

    try {
        const (genAI as any).cacheManager = genAI.(genAI as any).cacheManager;
        const cache = await (genAI as any).cacheManager.get(cacheName);

        if (!cache) {
            throw new Error('Cache not found or expired');
        }

        const model = genAI.getGenerativeModelFromCachedContent(cache);

        const chat = model.startChat({
            history: history.map(msg => ({
                role: msg.role,
                parts: [{ text: msg.content }]
            }))
        });

        const result = await chat.sendMessageStream(userMessage);

        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text) {
                yield text;
            }
        }

        console.log('[ContextCache] ✅ Streaming complete');

    } catch (error) {
        console.error('[ContextCache] ❌ Streaming failed:', error);
        throw error;
    }
}

