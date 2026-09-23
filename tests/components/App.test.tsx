// @vitest-environment jsdom
import { act } from 'react'
import { expect, it, vi } from 'vitest'

import App from '../../src/App'
import { verifyCredentials } from '../../src/api/greenApi'
import { pollNotifications } from '../../src/api/pollNotifications'
import { setupComponentTest } from '../helpers/component'

vi.mock('../../src/api/greenApi', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../src/api/greenApi')>()),
    verifyCredentials: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('../../src/api/pollNotifications', () => ({
    pollNotifications: vi.fn(),
}))

const view = setupComponentTest()

it('connects with entered credentials and stops polling on disconnect', async () => {
    const stopPolling = vi.fn()

    vi.mocked(pollNotifications).mockReturnValue(stopPolling)

    await view.render(<App />)

    const form = view.container.querySelector('form')!

    form.querySelector<HTMLInputElement>('[name="idInstance"]')!.value =
        '4100000000'
    form.querySelector<HTMLInputElement>('[name="apiTokenInstance"]')!.value =
        'test-token-not-real'

    await act(async () => form.requestSubmit())

    const expectedCredentials = {
        apiUrl: 'https://4100.api.green-api.com',
        idInstance: '4100000000',
        apiTokenInstance: 'test-token-not-real',
    }

    expect(verifyCredentials).toHaveBeenCalledWith(
        expectedCredentials,
        expect.any(AbortSignal),
    )
    expect(pollNotifications).toHaveBeenCalledExactlyOnceWith(
        expectedCredentials,
        expect.any(Function),
        expect.any(Function),
    )
    expect(view.container.querySelector('[name="apiTokenInstance"]')).toBeNull()

    const disconnect = Array.from(
        view.container.querySelectorAll('button'),
    ).find((button) => button.textContent === 'Отключиться')!

    expect(disconnect).toBeDefined()

    await act(async () => disconnect.click())

    expect(stopPolling).toHaveBeenCalledOnce()
    expect(
        view.container.querySelector<HTMLInputElement>('[name="idInstance"]')
            ?.value,
    ).toBe('')
    expect(
        view.container.querySelector<HTMLInputElement>(
            '[name="apiTokenInstance"]',
        )?.value,
    ).toBe('')
    expect(view.container.querySelector('section[aria-label="Чат"]')).toBeNull()
})
