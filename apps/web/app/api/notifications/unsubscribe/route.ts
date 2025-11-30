import { NextResponse } from 'next/server'

export async function POST(request: Request) {
    try {
        const { endpoint } = await request.json()

        // TODO: Remove subscription from Supabase
        // const { error } = await supabase
        //   .from('push_subscriptions')
        //   .delete()
        //   .match({ endpoint })

        console.log('Removed push subscription:', endpoint)

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Error removing subscription:', error)
        return NextResponse.json(
            { error: 'Failed to remove subscription' },
            { status: 500 }
        )
    }
}
