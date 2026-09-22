// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { CredentialsForm } from '../../src/components/CredentialsForm'
import {
    verifyCredentials,
    setNotificationSettings,
    waitForNotificationSettings,
} from '../../src/api/greenApi'

vi.mock('../../src/api/greenApi', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../src/api/greenApi')>()),
    verifyCredentials: vi.fn().mockResolvedValue(undefined),
    setNotificationSettings: vi.fn().mockResolvedValue(undefined),
    waitForNotificationSettings: vi.fn().mockResolvedValue(undefined),
}))

let container: HTMLDivElement
let root: Root
beforeEach(() => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    container = document.createElement('div')
    document.body.append(container)
    root = createRoot(container)
})
afterEach(async () => {
    await act(async () => root.unmount())
    container.remove()
    vi.clearAllMocks()
    vi.unstubAllGlobals()
})

it.each([
    ['', 'https://4100.api.green-api.com'],
    ['https://test.green-api.com/', 'https://test.green-api.com'],
])(
    'connects with two required fields and optional server override %s',
    async (apiUrl, expectedUrl) => {
        const onConnect = vi.fn()
        await act(async () =>
            root.render(<CredentialsForm onConnect={onConnect} />),
        )
        expect(
            Array.from(
                container.querySelectorAll<HTMLInputElement>('input[required]'),
            ).map((input) => input.name),
        ).toEqual(['idInstance', 'apiTokenInstance'])
        const form = container.querySelector('form')!
        const serverInput =
            form.querySelector<HTMLInputElement>('[name="apiUrl"]')!
        expect(serverInput.closest('details')?.open).toBe(false)
        serverInput.value = apiUrl
        form.querySelector<HTMLInputElement>('[name="idInstance"]')!.value =
            '4100000000'
        form.querySelector<HTMLInputElement>(
            '[name="apiTokenInstance"]',
        )!.value = 'test-token-not-real'
        expect(
            form.querySelector<HTMLInputElement>(
                '[name="configureNotifications"]',
            )!.checked,
        ).toBe(false)
        await act(async () =>
            form
                .querySelector<HTMLInputElement>(
                    '[name="configureNotifications"]',
                )!
                .click(),
        )
        expect(form.checkValidity()).toBe(true)
        await act(async () => form.requestSubmit())
        const expectedCredentials = {
            apiUrl: expectedUrl,
            idInstance: '4100000000',
            apiTokenInstance: 'test-token-not-real',
        }
        expect(verifyCredentials).toHaveBeenCalledWith(
            expectedCredentials,
            expect.any(AbortSignal),
        )
        expect(setNotificationSettings).toHaveBeenCalledWith(
            expectedCredentials,
            expect.any(AbortSignal),
        )
        expect(waitForNotificationSettings).toHaveBeenCalledWith(
            expectedCredentials,
            expect.any(AbortSignal),
        )
        expect(
            vi.mocked(verifyCredentials).mock.invocationCallOrder[0],
        ).toBeLessThan(
            vi.mocked(setNotificationSettings).mock.invocationCallOrder[0],
        )
        expect(
            vi.mocked(setNotificationSettings).mock.invocationCallOrder[0],
        ).toBeLessThan(
            vi.mocked(waitForNotificationSettings).mock.invocationCallOrder[0],
        )
        expect(
            vi.mocked(waitForNotificationSettings).mock.invocationCallOrder[0],
        ).toBeLessThan(onConnect.mock.invocationCallOrder[0])
        expect(onConnect).toHaveBeenCalledWith(expectedCredentials)
    },
)

it.each(['credentials', 'settings', 'readiness'] as const)(
    'does not connect when %s fails',
    async (stage) => {
        const method = {
            credentials: verifyCredentials,
            settings: setNotificationSettings,
            readiness: waitForNotificationSettings,
        }[stage]
        vi.mocked(method).mockRejectedValueOnce(new Error('Ошибка подключения'))
        const onConnect = vi.fn()
        await act(async () =>
            root.render(<CredentialsForm onConnect={onConnect} />),
        )
        const form = container.querySelector('form')!
        form.querySelector<HTMLInputElement>('[name="idInstance"]')!.value =
            '4100000000'
        form.querySelector<HTMLInputElement>(
            '[name="apiTokenInstance"]',
        )!.value = 'test-token-not-real'
        await act(async () =>
            form
                .querySelector<HTMLInputElement>(
                    '[name="configureNotifications"]',
                )!
                .click(),
        )
        await act(async () => form.requestSubmit())
        expect(onConnect).not.toHaveBeenCalled()
        expect(container.querySelector('[role="alert"]')?.textContent).toBe(
            'Ошибка подключения',
        )
        expect(form.querySelector('button')?.disabled).toBe(false)
        if (stage === 'credentials')
            expect(setNotificationSettings).not.toHaveBeenCalled()
        if (stage !== 'readiness')
            expect(waitForNotificationSettings).not.toHaveBeenCalled()
    },
)

it.each([false, true])(
    'preserves existing settings with unchecked checkbox (toggled: %s)',
    async (toggle) => {
        const onConnect = vi.fn()
        await act(async () =>
            root.render(<CredentialsForm onConnect={onConnect} />),
        )
        const form = container.querySelector('form')!
        const checkbox = form.querySelector<HTMLInputElement>(
            '[name="configureNotifications"]',
        )!
        expect(checkbox.checked).toBe(false)
        if (toggle) {
            await act(async () => checkbox.click())
            await act(async () => checkbox.click())
        }
        form.querySelector<HTMLInputElement>('[name="idInstance"]')!.value =
            '4100000000'
        form.querySelector<HTMLInputElement>(
            '[name="apiTokenInstance"]',
        )!.value = 'test-token-not-real'
        await act(async () => form.requestSubmit())
        expect(verifyCredentials).toHaveBeenCalledOnce()
        expect(setNotificationSettings).not.toHaveBeenCalled()
        expect(waitForNotificationSettings).not.toHaveBeenCalled()
        expect(onConnect).toHaveBeenCalledOnce()
    },
)
