import { afterEach, describe, expect, it, vi } from 'vitest'

import {
    checkAccount,
    deleteNotification,
    receiveNotification,
    sendMessage,
    verifyCredentials,
} from '../../src/api/greenApi'

import type { Credentials } from '../../src/types/greenApi.types'

const credentials: Credentials = {
    apiUrl: 'https://test.green-api.com',
    idInstance: '0',
    apiTokenInstance: 'test-token-not-real',
}

const signal = new AbortController().signal

afterEach(() => vi.unstubAllGlobals())

describe('GREEN-API contract', () => {
    it('resolves phone numbers to Telegram chat IDs and sends using that ID', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce(Response.json({ exist: true, chatId: '42' }))
            .mockResolvedValueOnce(Response.json({ idMessage: 'message-1' }))

        vi.stubGlobal('fetch', fetchMock)

        const chatId = await checkAccount(credentials, '12345678901', signal)

        expect(
            await sendMessage(
                credentials,
                { chatId, message: 'Привет' },
                signal,
            ),
        ).toEqual({ idMessage: 'message-1' })
        expect(fetchMock.mock.calls[0][1].body).toBe(
            JSON.stringify({ phoneNumber: 12345678901 }),
        )
        expect(fetchMock.mock.calls[1][0]).toBe(
            'https://test.green-api.com/waInstance0/sendMessage/test-token-not-real',
        )
        expect(fetchMock.mock.calls[1][1]).toMatchObject({
            method: 'POST',
            body: JSON.stringify({ chatId: '42', message: 'Привет' }),
            credentials: 'omit',
            redirect: 'error',
        })
    })

    it('accepts empty and null polling responses', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce(new Response(''))
                .mockResolvedValueOnce(Response.json(null)),
        )

        expect(await receiveNotification(credentials, signal)).toBeNull()
        expect(await receiveNotification(credentials, signal)).toBeNull()
    })

    it('uses DELETE to acknowledge and checks the result', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValue(Response.json({ result: false }))

        vi.stubGlobal('fetch', fetchMock)

        await expect(
            deleteNotification(credentials, 7, signal),
        ).rejects.toThrow('Не удалось подтвердить')
        expect(fetchMock.mock.calls[0][0]).toContain(
            '/deleteNotification/test-token-not-real/7',
        )
        expect(fetchMock.mock.calls[0][1].method).toBe('DELETE')
    })

    it('rejects unauthorized instances and hidden phone numbers', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce(
                    Response.json({ stateInstance: 'notAuthorized' }),
                )
                .mockResolvedValueOnce(Response.json({ exist: false })),
        )

        await expect(verifyCredentials(credentials, signal)).rejects.toThrow(
            'Инстанс не готов',
        )
        await expect(
            checkAccount(credentials, '12345678901', signal),
        ).rejects.toThrow('номер скрыт')
    })

    it('does not expose server response bodies or request URLs in errors', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce(
                    new Response('sensitive server details', { status: 401 }),
                )
                .mockRejectedValueOnce(
                    new Error('fetch failed: sensitive request URL'),
                ),
        )

        await expect(verifyCredentials(credentials, signal)).rejects.toThrow(
            'Проверьте idInstance и apiTokenInstance.',
        )
        await expect(verifyCredentials(credentials, signal)).rejects.toThrow(
            'Нет ответа от GREEN-API.',
        )
    })

    it('rejects malformed successful responses', async () => {
        vi.stubGlobal(
            'fetch',
            vi
                .fn()
                .mockResolvedValueOnce(Response.json({ idMessage: 5 }))
                .mockResolvedValueOnce(
                    Response.json({ receiptId: '7', body: {} }),
                ),
        )

        await expect(
            sendMessage(
                credentials,
                { chatId: '42', message: 'hello' },
                signal,
            ),
        ).rejects.toThrow('подтвердить отправку')
        await expect(receiveNotification(credentials, signal)).rejects.toThrow(
            'некорректное уведомление',
        )
    })
})
