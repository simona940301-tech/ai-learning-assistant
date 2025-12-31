/**
 * Offline Page
 * 
 * Displayed when user is offline and tries to access uncached content
 */

import type { Metadata } from 'next'
import { OfflineContent } from './OfflineContent'

export const metadata: Metadata = {
    title: '離線模式',
    description: '您目前處於離線狀態',
}

export default function OfflinePage() {
    return <OfflineContent />
}
