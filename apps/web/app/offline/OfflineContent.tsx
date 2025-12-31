/**
 * Offline Content Component
 * 
 * Interactive content for the offline page
 */

'use client'

import { Home, RefreshCw, Wifi } from 'lucide-react'
import Link from 'next/link'

export function OfflineContent() {
    return (
        <div className="min-h-screen bg-gradient-to-b from-[#FAF6E9] to-[#F5EFE0] flex items-center justify-center p-4">
            <div className="max-w-md w-full text-center space-y-8">
                {/* Icon */}
                <div className="flex justify-center">
                    <div className="relative">
                        <div className="w-24 h-24 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Wifi className="w-12 h-12 text-yellow-600" strokeWidth={2} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xl font-bold">!</span>
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div className="space-y-2">
                    <h1 className="text-3xl font-bold text-gray-900">
                        您目前處於離線狀態
                    </h1>
                    <p className="text-gray-600">
                        請檢查您的網路連線，或瀏覽已快取的內容
                    </p>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw className="w-5 h-5" />
                        重新載入
                    </button>

                    <Link
                        href="/"
                        className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 border-2 border-gray-200"
                    >
                        <Home className="w-5 h-5" />
                        返回首頁
                    </Link>
                </div>

                {/* Tips */}
                <div className="bg-white rounded-lg p-6 text-left space-y-4 shadow-sm">
                    <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-yellow-500">💡</span>
                        離線小提示
                    </h2>
                    <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">•</span>
                            <span>您可以瀏覽之前訪問過的頁面</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">•</span>
                            <span>已快取的圖片和資料仍可查看</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-yellow-500 mt-0.5">•</span>
                            <span>重新連線後，資料將自動同步</span>
                        </li>
                    </ul>
                </div>

                {/* Chick companion */}
                <div className="text-center text-sm text-gray-500">
                    <p>小雞正在等待網路恢復... 🐣</p>
                </div>
            </div>
        </div>
    )
}
