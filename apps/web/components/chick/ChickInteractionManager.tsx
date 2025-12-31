'use client'

import { useEffect, useCallback } from 'react'
import { useChickStore } from '@/src/store/chickStore'

/**
 * 統一的 Chick 互動管理器
 * 負責：
 * 1. 監聽新訊息並自動顯示氣泡
 * 2. 管理互動狀態
 * 3. 協調各組件間的互動
 */
export function ChickInteractionManager() {
  const {
    messages,
    messagesUnreadCount,
    speechBubbleVisible,
    showSpeechBubble,
    fetchMessages,
    fetchStatus,
  } = useChickStore((state) => ({
    messages: state.messages,
    messagesUnreadCount: state.messagesUnreadCount,
    speechBubbleVisible: state.speechBubbleVisible,
    showSpeechBubble: state.showSpeechBubble,
    fetchMessages: state.fetchMessages,
    fetchStatus: state.fetchStatus,
  }))

  // 監聽新訊息並自動顯示
  useEffect(() => {
    // 如果有未讀訊息且氣泡未顯示，自動顯示
    if (messagesUnreadCount > 0 && !speechBubbleVisible) {
      const hasUnreadMessage = messages.some((m) => !m.readAt)
      if (hasUnreadMessage) {
        // 延遲一點顯示，讓動畫更自然
        const timer = setTimeout(() => {
          showSpeechBubble()
        }, 500)
        return () => clearTimeout(timer)
      }
    }
  }, [messagesUnreadCount, speechBubbleVisible, messages, showSpeechBubble])

  // 定期檢查新訊息（每30秒）
  useEffect(() => {
    const interval = setInterval(() => {
      // 只在沒有載入中時檢查
      const { messagesLoading } = useChickStore.getState()
      if (!messagesLoading) {
        void fetchMessages(5) // 只檢查最新的5條訊息
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [fetchMessages])

  // 當狀態更新時，檢查是否有新訊息
  useEffect(() => {
    let lastUnreadCount = messagesUnreadCount

    // 監聽 store 的變化
    const unsubscribe = useChickStore.subscribe((state) => {
      const currentUnread = state.messagesUnreadCount
      // 如果未讀數量增加且氣泡未顯示，自動顯示
      if (currentUnread > lastUnreadCount) {
        if (!state.speechBubbleVisible) {
          const hasUnreadMessage = state.messages.some((m) => !m.readAt)
          if (hasUnreadMessage) {
            setTimeout(() => {
              state.showSpeechBubble()
            }, 500)
          }
        }
      }
      lastUnreadCount = currentUnread
    })

    return unsubscribe
  }, [messagesUnreadCount, speechBubbleVisible])

  return null // 這個組件不渲染任何內容
}

