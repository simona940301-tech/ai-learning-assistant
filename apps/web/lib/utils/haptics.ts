export const Haptics = {
    // Light tap (selection, toggle)
    light: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(10);
        }
    },

    // Medium impact (swipe threshold reached)
    medium: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate(40);
        }
    },

    // Heavy impact (success/error, completion)
    heavy: () => {
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([10, 30, 10]); // Pattern
        }
    }
};
