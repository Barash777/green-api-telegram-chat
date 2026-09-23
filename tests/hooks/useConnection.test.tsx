// @vitest-environment jsdom
import { act, useLayoutEffect } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'

import { useConnection } from '../../src/hooks/useConnection'
import {
    verifyCredentials,
    setNotificationSettings,
    waitForNotificationSettings,
} from '../../src/api/greenApi'
import { setupComponentTest } from '../helpers/component'

vi.mock('../../src/api/greenApi', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../src/api/greenApi')>()),
    verifyCredentials: vi.fn(),
    setNotificationSettings: vi.fn(),
    waitForNotificationSettings: vi.fn(),
}))

const credentials = {
    apiUrl: 'https://test.green-api.com',
    idInstance: '0',
    apiTokenInstance: 'test-token-not-real',
}
const view = setupComponentTest()
const onConnect = vi.fn()
let connection: ReturnType<typeof useConnection> | undefined

function Harness() {
    const state = useConnection(onConnect)

    useLayoutEffect(() => {
        connection = state
    }, [state])

    return null
}

function session() {
    if (!connection) throw new Error('Hook has not mounted')

    return connection
}

function pendingRequest() {
    let resolve: () => void = () => {}
    const promise = new Promise<void>((finish) => {
        resolve = finish
    })

    return { promise, resolve }
}

beforeEach(async () => {
    connection = undefined
    onConnect.mockReset()
    vi.mocked(verifyCredentials).mockReset().mockResolvedValue(undefined)
    vi.mocked(setNotificationSettings).mockReset().mockResolvedValue(undefined)
    vi.mocked(waitForNotificationSettings)
        .mockReset()
        .mockResolvedValue(undefined)

    await view.render(<Harness />)
})

it('normalizes credentials and connects without changing settings when disabled', async () => {
    await act(async () =>
        session().connect(
            {
                apiUrl: ` ${credentials.apiUrl}/ `,
                idInstance: ' 0 ',
                apiTokenInstance: ` ${credentials.apiTokenInstance} `,
            },
            false,
        ),
    )

    expect(verifyCredentials).toHaveBeenCalledExactlyOnceWith(
        credentials,
        expect.any(AbortSignal),
    )
    expect(setNotificationSettings).not.toHaveBeenCalled()
    expect(waitForNotificationSettings).not.toHaveBeenCalled()
    expect(onConnect).toHaveBeenCalledExactlyOnceWith(credentials)
    expect(session()).toMatchObject({
        connectionStage: 'idle',
        isConnecting: false,
        error: null,
    })
})

it('progresses through checking, settings and readiness while blocking duplicate connects', async () => {
    const checking = pendingRequest()
    const settings = pendingRequest()
    const readiness = pendingRequest()

    vi.mocked(verifyCredentials).mockReturnValueOnce(checking.promise)
    vi.mocked(setNotificationSettings).mockReturnValueOnce(settings.promise)
    vi.mocked(waitForNotificationSettings).mockReturnValueOnce(
        readiness.promise,
    )

    let pending: Promise<void> | undefined

    await act(async () => {
        pending = session().connect(credentials, true)
    })
    await act(async () => session().connect(credentials, true))

    expect(session()).toMatchObject({
        connectionStage: 'checking',
        isConnecting: true,
    })
    expect(verifyCredentials).toHaveBeenCalledOnce()
    expect(setNotificationSettings).not.toHaveBeenCalled()

    await act(async () => checking.resolve())

    expect(session().connectionStage).toBe('settings')
    expect(setNotificationSettings).toHaveBeenCalledOnce()
    expect(waitForNotificationSettings).not.toHaveBeenCalled()

    await act(async () => settings.resolve())

    expect(session().connectionStage).toBe('waiting')
    expect(waitForNotificationSettings).toHaveBeenCalledOnce()
    expect(onConnect).not.toHaveBeenCalled()

    await act(async () => {
        readiness.resolve()
        await pending
    })

    expect(onConnect).toHaveBeenCalledExactlyOnceWith(credentials)
    expect(session()).toMatchObject({
        connectionStage: 'idle',
        isConnecting: false,
    })
})

it.each(['checking', 'settings', 'waiting'] as const)(
    'reports a failure during %s and allows a clean retry',
    async (stage) => {
        const method = {
            checking: verifyCredentials,
            settings: setNotificationSettings,
            waiting: waitForNotificationSettings,
        }[stage]

        vi.mocked(method).mockRejectedValueOnce(new Error('Сеть недоступна'))

        await act(async () => session().connect(credentials, true))

        expect(onConnect).not.toHaveBeenCalled()
        expect(session()).toMatchObject({
            connectionStage: 'idle',
            isConnecting: false,
            error: 'Сеть недоступна',
        })

        if (stage === 'checking')
            expect(setNotificationSettings).not.toHaveBeenCalled()
        if (stage !== 'waiting')
            expect(waitForNotificationSettings).not.toHaveBeenCalled()

        const retry = pendingRequest()

        vi.mocked(verifyCredentials).mockReturnValueOnce(retry.promise)

        let pending: Promise<void> | undefined

        await act(async () => {
            pending = session().connect(credentials, true)
        })

        expect(session().error).toBeNull()

        await act(async () => {
            retry.resolve()
            await pending
        })

        expect(onConnect).toHaveBeenCalledExactlyOnceWith(credentials)
        expect(session().isConnecting).toBe(false)
    },
)

it.each(['checking', 'settings', 'waiting'] as const)(
    'aborts during %s and ignores a late success after unmount',
    async (stage) => {
        const method = {
            checking: verifyCredentials,
            settings: setNotificationSettings,
            waiting: waitForNotificationSettings,
        }[stage]
        const request = pendingRequest()

        vi.mocked(method).mockReturnValueOnce(request.promise)

        let pending: Promise<void> | undefined

        await act(async () => {
            pending = session().connect(credentials, true)
        })

        expect(session().connectionStage).toBe(stage)

        const signal = vi.mocked(method).mock.calls[0][1]

        await view.render(null)

        expect(signal.aborted).toBe(true)

        await act(async () => {
            request.resolve()
            await pending
        })

        expect(onConnect).not.toHaveBeenCalled()
        if (stage === 'checking')
            expect(setNotificationSettings).not.toHaveBeenCalled()
        if (stage !== 'waiting')
            expect(waitForNotificationSettings).not.toHaveBeenCalled()
    },
)

it('rejects invalid credentials before making API requests', async () => {
    await act(async () =>
        session().connect({ ...credentials, idInstance: '' }, true),
    )

    expect(verifyCredentials).not.toHaveBeenCalled()
    expect(setNotificationSettings).not.toHaveBeenCalled()
    expect(onConnect).not.toHaveBeenCalled()
    expect(session().error).toContain('idInstance')
    expect(session().isConnecting).toBe(false)
})
