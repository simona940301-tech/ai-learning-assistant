import { NextResponse } from 'next/server'
import { getApiUser } from '@/lib/api/auth'

export async function POST(req: Request) {
    const { supabase, user, errorType } = await getApiUser()
    if (!user) {
        const status = errorType === 'unauthenticated' ? 401 : 400
        return NextResponse.json({ error: 'UNAUTHORIZED', message: 'Not authenticated' }, { status })
    }

    try {
        const body = await req.json().catch(() => ({}))
        const quantity = body.quantity || 1
        const PRICE_PER_BOWL = 100

        if (quantity < 1) {
            return NextResponse.json({ error: 'INVALID_QUANTITY' }, { status: 400 })
        }

        const totalCost = quantity * PRICE_PER_BOWL

        // 1. Check balance
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('user_wallet_balance, chick_food_bowls')
            .eq('id', user.id)
            .single()

        if (profileError || !profile) {
            return NextResponse.json({ error: 'PROFILE_NOT_FOUND' }, { status: 500 })
        }

        if ((profile.user_wallet_balance || 0) < totalCost) {
            return NextResponse.json({ error: 'INSUFFICIENT_FUNDS' }, { status: 400 })
        }

        // 2. Perform Transaction (Deduct coins, Add bowls)
        // Note: ideally this should be a stored procedure or transaction, but for now we do it in application logic
        // or use a single update if possible. Since we are updating two columns in the same row, it's atomic per row.

        const newBalance = (profile.user_wallet_balance || 0) - totalCost
        const newBowls = (profile.chick_food_bowls || 0) + quantity

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                user_wallet_balance: newBalance,
                chick_food_bowls: newBowls
            })
            .eq('id', user.id)

        if (updateError) {
            console.error('[POST /api/shop/buy-food] Update error:', updateError)
            return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
        }

        // 3. Log Transaction (Optional but recommended)
        await supabase.from('transactions').insert({
            user_id: user.id,
            amount: -totalCost,
            transaction_type: 'DEPOSIT', // Or 'PURCHASE' if available, using DEPOSIT (negative) for now based on schema
            status: 'SUCCESS',
            metadata: { item: 'food_bowl', quantity }
        })

        return NextResponse.json({
            success: true,
            newBalance,
            newBowls
        })

    } catch (error) {
        console.error('[POST /api/shop/buy-food] Unexpected error:', error)
        return NextResponse.json({ error: 'INTERNAL_ERROR' }, { status: 500 })
    }
}
