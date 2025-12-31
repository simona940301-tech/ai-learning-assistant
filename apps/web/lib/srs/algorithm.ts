
export interface SRSState {
    interval: number // days
    repetitions: number
    ease_factor: number
    next_review_date: string | null
    last_review_date: string | null
}

export const INITIAL_SRS_STATE: SRSState = {
    interval: 0,
    repetitions: 0,
    ease_factor: 2.5,
    next_review_date: null,
    last_review_date: null,
}

/**
 * Calculates the next SRS state using the SuperMemo-2 algorithm.
 * @param currentState The current state of the item
 * @param quality Quality of the review (0-5). 0-2: Incorrect, 3-5: Correct.
 * @returns The new SRS state
 */
export function calculateNextSRSState(currentState: SRSState, quality: number): SRSState {
    let { interval, repetitions, ease_factor } = currentState

    if (quality >= 3) {
        // Correct response
        if (repetitions === 0) {
            interval = 1
        } else if (repetitions === 1) {
            interval = 6
        } else {
            interval = Math.round(interval * ease_factor)
        }

        repetitions += 1

        // Update Ease Factor
        // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
        ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
        if (ease_factor < 1.3) ease_factor = 1.3
    } else {
        // Incorrect response
        repetitions = 0
        interval = 1
        // Ease factor remains unchanged
    }

    const nextReview = new Date()
    nextReview.setDate(nextReview.getDate() + interval)

    return {
        interval,
        repetitions,
        ease_factor,
        next_review_date: nextReview.toISOString(),
        last_review_date: new Date().toISOString(),
    }
}
