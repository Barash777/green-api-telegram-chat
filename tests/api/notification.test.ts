import { describe, expect, it } from 'vitest'

import { mapIncomingMessage } from '../../src/api/notification'

const incoming = {
    typeWebhook: 'incomingMessageReceived',
    idMessage: '1',
    timestamp: 1700000000,
    senderData: { chatId: '42', chatName: 'Собеседник' },
    messageData: {
        typeMessage: 'textMessage',
        textMessageData: { textMessage: 'Привет\nмир' },
    },
}

describe('notification mapping', () => {
    it('preserves Telegram chat IDs and converts seconds to milliseconds', () => {
        expect(mapIncomingMessage(incoming)).toEqual({
            chat: { id: '42', title: 'Собеседник' },
            message: {
                id: '1',
                chatId: '42',
                text: 'Привет\nмир',
                timestamp: 1700000000000,
                direction: 'incoming',
                status: 'received',
            },
        })
    })
    it('handles text with a URL', () => {
        expect(
            mapIncomingMessage({
                ...incoming,
                messageData: {
                    typeMessage: 'extendedTextMessage',
                    extendedTextMessageData: { text: 'https://example.com' },
                },
            })?.message.text,
        ).toBe('https://example.com')
    })
    it('ignores non-text messages and unrelated events', () => {
        expect(
            mapIncomingMessage({
                ...incoming,
                messageData: { typeMessage: 'imageMessage' },
            }),
        ).toBeNull()
        expect(
            mapIncomingMessage({ typeWebhook: 'stateInstanceChanged' }),
        ).toBeNull()
    })
    it('does not acknowledge malformed text as processed', () => {
        expect(() =>
            mapIncomingMessage({ ...incoming, senderData: null }),
        ).toThrow()
        expect(() =>
            mapIncomingMessage({ ...incoming, timestamp: Infinity }),
        ).toThrow()
    })
})
