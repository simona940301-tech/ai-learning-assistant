import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const subscription = await request.json()

        // TODO: Save subscription to Supabase
        // const { error } = await supabase
        //   .from('push_subscriptions')
        //   .insert({ subscription, user_id: userId })

        console.log('Received push subscription:', subscription)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error saving subscription:', error)
        return NextResponse.json(
            { error: 'Failed to save subscription' },
            { status: 500 }
        )
    }
}
