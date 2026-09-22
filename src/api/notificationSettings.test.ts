import { afterEach, expect, it, vi } from 'vitest'
import {
    setNotificationSettings,
    waitForNotificationSettings,
} from './greenApi'

const credentials = {
    apiUrl: 'https://test.green-api.com',
    idInstance: '0',
    apiTokenInstance: 'test-token-not-real',
}
const settings = {
    webhookUrl: '',
    outgoingWebhook: 'yes',
    stateWebhook: 'yes',
    incomingWebhook: 'yes',
}
afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
})

it('posts exactly the requested settings and requires saveSettings=true', async () => {
    const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(Response.json({ saveSettings: true }))
        .mockResolvedValueOnce(Response.json({ saveSettings: false }))
        .mockResolvedValueOnce(Response.json({}))
    vi.stubGlobal('fetch', fetchMock)
    const signal = new AbortController().signal
    await setNotificationSettings(credentials, signal)
    expect(fetchMock.mock.calls[0][0]).toBe(
        'https://test.green-api.com/waInstance0/setSettings/test-token-not-real',
    )
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
        method: 'POST',
        body: JSON.stringify(settings),
        headers: { 'Content-Type': 'application/json' },
    })
    await expect(setNotificationSettings(credentials, signal)).rejects.toThrow(
        'Не удалось сохранить',
    )
    await expect(setNotificationSettings(credentials, signal)).rejects.toThrow(
        'Не удалось сохранить',
    )
})

it('waits for settings and authorization after a restart without repeating SetSettings', async () => {
    vi.useFakeTimers()
    const fetchMock = vi
        .fn()
        .mockResolvedValueOnce(
            Response.json({ ...settings, incomingWebhook: 'no' }),
        )
        .mockResolvedValueOnce(Response.json(settings))
        .mockResolvedValueOnce(Response.json({ stateInstance: 'starting' }))
        .mockResolvedValueOnce(Response.json(settings))
        .mockResolvedValueOnce(Response.json({ stateInstance: 'authorized' }))
    vi.stubGlobal('fetch', fetchMock)
    const ready = vi.fn()
    const pending = waitForNotificationSettings(
        credentials,
        new AbortController().signal,
    ).then(ready)
    await vi.advanceTimersByTimeAsync(10_000)
    expect(ready).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(5_000)
    await pending
    expect(ready).toHaveBeenCalledOnce()
    expect(fetchMock).toHaveBeenCalledTimes(5)
    expect(
        fetchMock.mock.calls.every(([url]) => !url.includes('/setSettings/')),
    ).toBe(true)
})

it('aborts the readiness timer without making further requests', async () => {
    vi.useFakeTimers()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const controller = new AbortController()
    const pending = waitForNotificationSettings(credentials, controller.signal)
    const assertion = expect(pending).rejects.toMatchObject({
        name: 'AbortError',
    })
    controller.abort()
    await assertion
    await vi.advanceTimersByTimeAsync(10_000)
    expect(fetchMock).not.toHaveBeenCalled()
})
