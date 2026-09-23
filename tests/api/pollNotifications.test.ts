import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { pollNotifications } from '../../src/api/pollNotifications'
import {
    ApiError,
    deleteNotification,
    receiveNotification,
} from '../../src/api/greenApi'

vi.mock('../../src/api/greenApi', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../src/api/greenApi')>()),
    receiveNotification: vi.fn(),
    deleteNotification: vi.fn(),
}))

const credentials = {
    apiUrl: 'https://test.green-api.com',
    idInstance: '0',
    apiTokenInstance: 'test-token-not-real',
}

const notification = { receiptId: 7, body: { typeWebhook: 'ignored' } }
let stop: (() => void) | undefined

beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(receiveNotification).mockReset().mockResolvedValue(null)
    vi.mocked(deleteNotification).mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
    stop?.()
    stop = undefined
    vi.useRealTimers()
})

describe('notification polling', () => {
    it('waits for processing and acknowledgement before starting another request', async () => {
        let acknowledge: () => void = () => {}

        vi.mocked(receiveNotification).mockResolvedValue(notification)
        vi.mocked(deleteNotification).mockImplementationOnce(
            () =>
                new Promise<void>((resolve) => {
                    acknowledge = resolve
                }),
        )

        const processed = vi.fn()

        stop = pollNotifications(credentials, processed, vi.fn())

        await vi.advanceTimersByTimeAsync(0)

        expect(processed).toHaveBeenCalledWith(notification)
        expect(deleteNotification).toHaveBeenCalledWith(
            credentials,
            7,
            expect.any(AbortSignal),
        )

        await vi.advanceTimersByTimeAsync(5000)

        expect(receiveNotification).toHaveBeenCalledTimes(1)

        acknowledge()

        await vi.advanceTimersByTimeAsync(500)

        expect(receiveNotification).toHaveBeenCalledTimes(2)
    })

    it('backs off after a network error and recovers', async () => {
        vi.mocked(receiveNotification).mockRejectedValueOnce(
            new ApiError('Сеть недоступна'),
        )

        const status = vi.fn()

        stop = pollNotifications(credentials, vi.fn(), status)

        await vi.advanceTimersByTimeAsync(0)

        expect(status).toHaveBeenCalledWith(
            expect.stringContaining('автоматически'),
        )

        await vi.advanceTimersByTimeAsync(1999)

        expect(receiveNotification).toHaveBeenCalledTimes(1)

        await vi.advanceTimersByTimeAsync(1)

        expect(receiveNotification).toHaveBeenCalledTimes(2)
        expect(status).toHaveBeenLastCalledWith(null)
    })

    it('stops retrying permanent authentication errors', async () => {
        vi.mocked(receiveNotification).mockRejectedValue(
            new ApiError('Неверный токен', 401),
        )
        stop = pollNotifications(credentials, vi.fn(), vi.fn())

        await vi.advanceTimersByTimeAsync(60_000)

        expect(receiveNotification).toHaveBeenCalledTimes(1)
    })

    it('aborts an in-flight request and ignores its late result after cleanup', async () => {
        let resolveRequest: (response: typeof notification) => void = () => {}

        vi.mocked(receiveNotification).mockImplementationOnce(
            () =>
                new Promise((resolve) => {
                    resolveRequest = resolve
                }),
        )

        const processed = vi.fn()

        stop = pollNotifications(credentials, processed, vi.fn())

        await vi.advanceTimersByTimeAsync(0)

        const signal = vi.mocked(receiveNotification).mock.calls[0][1]

        stop()

        expect(signal.aborted).toBe(true)

        resolveRequest(notification)

        await vi.advanceTimersByTimeAsync(60_000)

        expect(processed).not.toHaveBeenCalled()
        expect(deleteNotification).not.toHaveBeenCalled()
        expect(receiveNotification).toHaveBeenCalledTimes(1)
    })

    it('does not start the disposed StrictMode probe loop', async () => {
        pollNotifications(credentials, vi.fn(), vi.fn())()
        stop = pollNotifications(credentials, vi.fn(), vi.fn())

        await vi.advanceTimersByTimeAsync(0)

        expect(receiveNotification).toHaveBeenCalledTimes(1)
    })

    it('keeps unprocessed notifications in the queue', async () => {
        vi.mocked(receiveNotification).mockResolvedValue(notification)
        stop = pollNotifications(
            credentials,
            () => {
                throw new Error('Malformed message')
            },
            vi.fn(),
        )

        await vi.advanceTimersByTimeAsync(0)

        expect(deleteNotification).not.toHaveBeenCalled()
    })
})
