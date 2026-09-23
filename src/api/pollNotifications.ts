import type { Credentials, Notification } from '../types/greenApi.types'
import {
    ApiError,
    deleteNotification,
    errorMessage,
    receiveNotification,
} from './greenApi'

export function pollNotifications(
    credentials: Credentials,
    onNotification: (notification: Notification) => void,
    onStatus: (error: string | null) => void,
): () => void {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout>
    let failures = 0

    async function poll() {
        let delay = 500
        try {
            const notification = await receiveNotification(
                credentials,
                controller.signal,
            )
            if (controller.signal.aborted) return
            if (notification) {
                onNotification(notification)
                // The queue advances only after processing and acknowledging the notification.
                await deleteNotification(
                    credentials,
                    notification.receiptId,
                    controller.signal,
                )
            }
            if (controller.signal.aborted) return
            failures = 0
            onStatus(null)
        } catch (error) {
            if (controller.signal.aborted) return
            const permanent =
                error instanceof ApiError &&
                [400, 401, 403, 404].includes(error.status)
            onStatus(
                `${errorMessage(error)} ${permanent ? 'Переподключитесь после исправления.' : 'Повторяем подключение автоматически.'}`,
            )
            if (permanent) return
            delay = Math.min(30_000, 2_000 * 2 ** Math.min(failures++, 4))
        }
        if (!controller.signal.aborted) timer = setTimeout(poll, delay)
    }

    // Deferring the first request lets React StrictMode dispose its probe effect.
    timer = setTimeout(poll, 0)
    return () => {
        controller.abort()
        clearTimeout(timer)
    }
}
