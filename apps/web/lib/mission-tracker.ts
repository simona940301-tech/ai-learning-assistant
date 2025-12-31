/**
 * Mission Progress Tracker
 * Centralized event bus for tracking mission progress across the app
 */

import { toast } from 'sonner'

export type MissionEventType =
    | 'BATTLE_COMPLETED'
    | 'BATTLE_WON'
    | 'CHICK_FED'
    | 'ERROR_REVIEWED'
    | 'ALL_MISSIONS_COMPLETED'

interface MissionProgressResponse {
    success: boolean
    missions?: Array<{
        id: string
        title: string
        current_count: number
        target_count: number
        is_completed: boolean
    }>
    newly_completed?: string[]
    all_completed?: boolean
}

/**
 * Track a mission event and show progress notification
 */
export async function trackMissionEvent(
    eventType: MissionEventType,
    payload?: Record<string, any>
): Promise<MissionProgressResponse | null> {
    try {
        // Map event types to mission types
        const missionTypeMap: Record<MissionEventType, string> = {
            BATTLE_COMPLETED: 'play_battle',
            BATTLE_WON: 'win_battle',
            CHICK_FED: 'feed_chick',
            ERROR_REVIEWED: 'review_error',
            ALL_MISSIONS_COMPLETED: 'all_completed'
        }

        const missionType = missionTypeMap[eventType]
        if (!missionType) {
            console.warn('[Mission Tracker] Unknown event type:', eventType)
            return null
        }

        // Call the progress API
        const response = await fetch('/api/missions/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                mission_type: missionType,
                increment: 1,
                ...payload
            })
        })

        if (!response.ok) {
            // Silently fail if user doesn't have missions today
            if (response.status === 404) {
                return null
            }
            throw new Error('Failed to update mission progress')
        }

        const data: MissionProgressResponse = await response.json()

        // Show progress notification if there are active missions
        if (data.missions && data.missions.length > 0) {
            showMissionProgressNotification(data, eventType)
        }

        return data
    } catch (error) {
        console.error('[Mission Tracker] Error:', error)
        return null
    }
}

/**
 * Show a toast notification for mission progress
 */
function showMissionProgressNotification(
    data: MissionProgressResponse,
    eventType: MissionEventType
) {
    const { missions, newly_completed, all_completed } = data

    // If all missions just completed
    if (all_completed && newly_completed && newly_completed.length > 0) {
        toast.success('🎉 恭喜！所有今日任務已完成！', {
            description: '前往任務面板領取獎勵',
            duration: 5000,
            style: {
                background: 'hsl(42, 98%, 70%)',
                color: 'hsl(14, 26%, 29%)',
                border: 'none',
            },
            action: {
                label: '領取獎勵',
                onClick: () => {
                    // Trigger claim (you can implement this)
                    console.log('Navigate to missions')
                }
            }
        })
        return
    }

    // If a specific mission just completed
    if (newly_completed && newly_completed.length > 0) {
        const completedMission = missions?.find(m => newly_completed.includes(m.id))
        if (completedMission) {
            toast.success(`✅ 任務完成：${completedMission.title}`, {
                duration: 3000,
                style: {
                    background: 'hsl(123, 23%, 42%)',
                    color: 'white',
                    border: 'none',
                }
            })
        }
    } else {
        // Show progress update for active missions
        const activeMission = missions?.find(m =>
            !m.is_completed &&
            eventType !== 'ALL_MISSIONS_COMPLETED'
        )

        if (activeMission) {
            const progressPercent = Math.round(
                (activeMission.current_count / activeMission.target_count) * 100
            )

            toast.info(
                `📊 ${activeMission.title}`,
                {
                    description: `進度：${activeMission.current_count}/${activeMission.target_count} (${progressPercent}%)`,
                    duration: 2000,
                    style: {
                        background: 'hsl(50, 100%, 98%)',
                        color: 'hsl(14, 26%, 29%)',
                        borderLeft: '4px solid hsl(42, 98%, 70%)',
                    }
                }
            )
        }
    }
}

/**
 * Get current mission status without updating
 */
export async function getMissionStatus(): Promise<{
    missions: Array<any>
    all_completed: boolean
    rewards_claimed: boolean
} | null> {
    try {
        const response = await fetch('/api/missions/daily', { credentials: 'include' })
        if (!response.ok) return null

        return await response.json()
    } catch (error) {
        console.error('[Mission Tracker] Error fetching status:', error)
        return null
    }
}

/**
 * Optimistic UI update helper
 * Shows feedback immediately before API call completes
 */
export function showOptimisticMissionFeedback(eventType: MissionEventType) {
    const feedbackMessages: Record<MissionEventType, string> = {
        BATTLE_COMPLETED: '對戰完成！',
        BATTLE_WON: '戰鬥勝利！',
        CHICK_FED: '餵食成功！',
        ERROR_REVIEWED: '錯題複習完成！',
        ALL_MISSIONS_COMPLETED: '所有任務完成！'
    }

    const message = feedbackMessages[eventType] || '任務進度更新'

    // Show subtle feedback toast
    toast.loading(message, {
        duration: 1000,
        style: {
            background: 'hsl(50, 100%, 98%)',
            color: 'hsl(14, 26%, 29%)',
        }
    })
}
