import { NextRequest, NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'
import type { DownloadQuestionSetRequest, DownloadQuestionSetResponse } from '@/lib/types/question-sets'

export const dynamic = 'force-dynamic'

/**
 * POST /api/store/question-sets/download
 * 下載題本到個人 Backpack
 */
export async function POST(req: NextRequest) {
    try {
        const { supabase, user } = await getApiUser(req)

        if (!user) {
            return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 }) as any
        }

        const body: DownloadQuestionSetRequest = await req.json()
        const { setId } = body

        if (!setId) {
            return NextResponse.json(
                { error: 'VALIDATION_ERROR', message: 'setId is required' },
                { status: 400 }
            ) as any
        }

        // 1. 驗證題本存在且可下載
        const { data: questionSet, error: setError } = await supabase
            .from('question_sets')
            .select('id, title, is_public, status, price')
            .eq('id', setId)
            .single()

        if (setError || !questionSet) {
            return NextResponse.json(
                { error: 'QUESTION_SET_NOT_FOUND', message: '題本不存在' },
                { status: 404 }
            ) as any
        }

        if (!questionSet.is_public || questionSet.status !== 'PUBLISHED') {
            return NextResponse.json(
                { error: 'QUESTION_SET_NOT_AVAILABLE', message: '題本目前無法下載' },
                { status: 403 }
            ) as any
        }


        // 檢查用戶是否有足夠的積分/貨幣購買
        if (questionSet.price > 0) {
            const { AuthorizationService } = await import('@/lib/services/authorization-service')
            const authService = new AuthorizationService(supabase)

            const purchaseCheck = await authService.checkPurchase(user.id, setId)

            if (purchaseCheck.hasPurchased) {
                // 已購買，允許下載
            } else {
                // 檢查餘額
                const balanceCheck = await authService.checkBalance(user.id, questionSet.price)

                if (!balanceCheck.sufficient) {
                    return NextResponse.json(
                        {
                            error: 'INSUFFICIENT_BALANCE',
                            message: `金幣不足。需要 ${questionSet.price} 金幣，目前只有 ${balanceCheck.balance} 金幣`,
                            required: questionSet.price,
                            balance: balanceCheck.balance,
                        },
                        { status: 402 }
                    ) as any
                }

                // 扣除金幣
                const deductResult = await authService.deductBalance(user.id, questionSet.price)

                if (!deductResult.success) {
                    return NextResponse.json(
                        { error: 'PAYMENT_FAILED', message: deductResult.error },
                        { status: 500 }
                    ) as any
                }

                console.log(`[Download API] User ${user.id} purchased set ${setId} for ${questionSet.price} coins`)
            }
        }


        // 2. 檢查是否已下載
        const { data: existing } = await supabase
            .from('user_question_sets')
            .select('id')
            .eq('user_id', user.id)
            .eq('set_id', setId)
            .maybeSingle()

        if (existing) {
            return NextResponse.json(
                {
                    success: true,
                    download: existing,
                    message: '您已下載此題本',
                    is_duplicate: true
                },
                { status: 200 }
            )
        }

        // 3. 創建下載記錄
        const { data: download, error: downloadError } = await supabase
            .from('user_question_sets')
            .insert({
                user_id: user.id,
                set_id: setId,
                downloaded_at: new Date().toISOString(),
                progress_data: { completed: 0, total: 0, correct_rate: 0 },
                practice_count: 0,
                is_favorite: false
            })
            .select()
            .single()

        if (downloadError) {
            console.error('[Download API] Error creating download:', downloadError)
            return NextResponse.json(
                { error: 'DATABASE_ERROR', message: downloadError.message },
                { status: 500 }
            ) as any
        }

        // 4. 更新題本下載數（使用 function 確保原子性）
        await supabase.rpc('increment_question_set_downloads', { p_set_id: setId })

        return NextResponse.json({
            success: true,
            download,
            message: `成功下載「${questionSet.title}」`,
            is_duplicate: false
        })

    } catch (error) {
        console.error('[Download API] Unexpected error:', error)
        return NextResponse.json(
            { error: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        ) as any
    }
}
