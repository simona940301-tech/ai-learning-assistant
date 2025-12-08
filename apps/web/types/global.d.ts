export { }

declare global {
    interface Window {
        gtag?: (
            command: string,
            targetId: string,
            config?: { [key: string]: any }
        ) => void;
    }
}
