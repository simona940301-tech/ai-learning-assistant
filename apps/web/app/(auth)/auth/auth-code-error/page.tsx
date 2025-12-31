'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'

function ErrorContent() {
    const searchParams = useSearchParams()
    const error = searchParams.get('error')
    const errorCode = searchParams.get('error_code')
    const errorDescription = searchParams.get('error_description')

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="max-w-md w-full space-y-8 text-center">
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-destructive">Authentication Error</h1>
                    <p className="text-muted-foreground">
                        We encountered an issue while signing you in.
                    </p>
                </div>

                <div className="bg-destructive/10 p-6 rounded-lg text-left space-y-2">
                    <p><strong>Error:</strong> {error}</p>
                    {errorCode && <p><strong>Code:</strong> {errorCode}</p>}
                    {errorDescription && <p><strong>Description:</strong> {errorDescription}</p>}
                </div>

                <div className="pt-4">
                    <Link
                        href="/onboarding"
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                        Return to Login
                    </Link>
                </div>
            </div>
        </div>
    )
}

export default function AuthCodeErrorPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ErrorContent />
        </Suspense>
    )
}
