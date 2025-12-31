'use client'

import { useSearchParams } from 'next/navigation'
import Script from 'next/script'
import { useEffect, useState } from 'react'

export function VConsoleLoader() {
    const searchParams = useSearchParams()
    const [shouldLoad, setShouldLoad] = useState(false)

    useEffect(() => {
        // Only load if ?debug=true is present in the URL
        if (searchParams.get('debug') === 'true') {
            setShouldLoad(true)
        }
    }, [searchParams])

    if (!shouldLoad) return null

    return (
        <>
            <Script
                src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js"
                strategy="afterInteractive"
                onLoad={() => {
                    // Initialize vConsole once the script is loaded
                    // @ts-ignore - vConsole is added to window
                    if (window.VConsole) {
                        // @ts-ignore
                        new window.VConsole()
                        console.log('📱 vConsole activated for mobile debugging')
                    }
                }}
            />
        </>
    )
}
