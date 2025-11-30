"use client"

import * as Dialog from '@radix-ui/react-dialog'
import Image from 'next/image'
import { useEffect } from 'react'
import { getChickImagePath } from './chickImage'
import type { ChickState } from '@/packages/server/chick/types'
import { useChickStore } from '@/src/store/chickStore'

export function ChickBottomSheet() {
  const {
    bottomSheetOpen,
    closeBottomSheet,
    messages,
    messagesLoading,
    iq,
    fatigue,
    emotionState,
    streakDays,
    fetchMessages,
    markMessageRead,
  } = useChickStore(state => ({
    bottomSheetOpen: state.bottomSheetOpen,
    closeBottomSheet: state.closeBottomSheet,
    messages: state.messages,
    messagesLoading: state.messagesLoading,
    iq: state.iq,
    fatigue: state.fatigue,
    emotionState: state.emotionState,
    streakDays: state.streakDays,
    fetchMessages: state.fetchMessages,
    markMessageRead: state.markMessageRead,
  }))

  useEffect(() => {
    if (bottomSheetOpen && messages.length === 0 && !messagesLoading) {
      void fetchMessages()
    }
  }, [bottomSheetOpen, messages.length, messagesLoading, fetchMessages])

  const chickState: ChickState = {
    iq,
    fatigue,
    emotionState
  }

  const imgSrc = getChickImagePath(chickState)

  return (
    <Dialog.Root open={bottomSheetOpen} onOpenChange={open => (open ? null : closeBottomSheet())}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30" />
        <Dialog.Content className="fixed inset-x-0 bottom-0 z-50 rounded-t-3xl bg-white p-4 shadow-xl ring-1 ring-neutral-200 dark:bg-neutral-900 dark:ring-neutral-700 md:left-1/2 md:max-w-md md:-translate-x-1/2 md:rounded-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src={imgSrc} alt="Chick" width={56} height={56} className="h-14 w-14 object-contain" />
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-50">小雞的訊息</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {streakDays > 0
                    ? `你已經連續 ${streakDays} 天來找我了！`
                    : '隨時查看你的小雞心情'}
                </p>
              </div>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-full p-2 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800 dark:hover:bg-neutral-800"
                aria-label="Close"
              >
                ✕
              </button>
            </Dialog.Close>
          </div>

          <div className="mt-4 max-h-[60vh] space-y-2 overflow-y-auto">
            {messagesLoading && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">載入中…</p>
            )}
            {!messagesLoading && messages.length === 0 && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">目前沒有訊息</p>
            )}
            {messages.map(message => {
              const isUnread = !message.readAt
              const created = new Date(message.createdAt ?? '').toLocaleString()
              return (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => void markMessageRead(message.id)}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    isUnread
                      ? 'border-blue-200 bg-blue-50 text-neutral-900 dark:border-blue-500/40 dark:bg-blue-950/30'
                      : 'border-neutral-200 bg-neutral-50 text-neutral-600 dark:border-neutral-800 dark:bg-neutral-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-sm">{message.text}</span>
                    {isUnread && <span className="mt-0.5 h-2 w-2 rounded-full bg-blue-500" />}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{created}</p>
                </button>
              )
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
