// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { setupComponentTest } from '../helpers/component'

import { CredentialsForm } from '../../src/components/CredentialsForm/CredentialsForm'
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

const view = setupComponentTest()

afterEach(() => {
    vi.clearAllMocks()
})

it.each([
    ['', 'https://4100.api.green-api.com'],
    ['https://test.green-api.com/', 'https://test.green-api.com'],
])(
    'connects with two required fields and optional server override %s',
    async (apiUrl, expectedUrl) => {
        const onConnect = vi.fn()

        await view.render(<CredentialsForm onConnect={onConnect} />)

        expect(
            Array.from(
                view.container.querySelectorAll<HTMLInputElement>(
                    'input[required]',
                ),
            ).map((input) => input.name),
        ).toEqual(['idInstance', 'apiTokenInstance'])

        const form = view.container.querySelector('form')!
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

        await view.render(<CredentialsForm onConnect={onConnect} />)

        const form = view.container.querySelector('form')!

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
        expect(
            view.container.querySelector('[role="alert"]')?.textContent,
        ).toBe('Ошибка подключения')
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

        await view.render(<CredentialsForm onConnect={onConnect} />)

        const form = view.container.querySelector('form')!
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
