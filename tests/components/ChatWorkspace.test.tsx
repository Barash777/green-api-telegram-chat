// @vitest-environment jsdom
import { act, StrictMode, useState } from 'react'
import { beforeEach, expect, it, vi } from 'vitest'

import { setupComponentTest } from '../helpers/component'

import { useChat } from '../../src/hooks/useChat'
import { ChatWorkspace } from '../../src/components/ChatWorkspace/ChatWorkspace'

import type { Message } from '../../src/types/message.types'

vi.mock('../../src/hooks/useChat')

const credentials = {
    apiUrl: 'https://test.green-api.com',
    idInstance: '0',
    apiTokenInstance: 'test-token-not-real',
}

const chats = [
    { id: 'first', title: 'Первый чат' },
    { id: 'empty', title: 'Пустой чат' },
    { id: 'third', title: 'Третий чат' },
]

const messages: Message[] = [
    {
        id: '1',
        chatId: 'first',
        text: 'Сообщение первого чата',
        timestamp: 1700000000000,
        direction: 'incoming',
        status: 'received',
    },
    {
        id: '1',
        chatId: 'third',
        text: 'Сообщение третьего чата',
        timestamp: 1700000000000,
        direction: 'incoming',
        status: 'received',
    },
]

const view = setupComponentTest()

beforeEach(() => {
    vi.mocked(useChat).mockImplementation(function useMockChat() {
        const [activeChatId, setActiveChatId] = useState<string | null>('first')

        return {
            chats,
            messages,
            activeChatId,
            setActiveChatId,
            receiveError: null,
            isReceiving: true,
            isSending: false,
            isOpening: false,
            chatError: null,
            sendError: null,
            openChat: vi.fn(),
            handleSendMessage: vi.fn().mockResolvedValue(true),
        }
    })
})

it('keeps exactly one message list and composer when switching between three chats', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {})

    await view.render(
        <StrictMode>
            <ChatWorkspace credentials={credentials} onDisconnect={() => {}} />
        </StrictMode>,
    )

    for (const id of ['empty', 'third', 'first', 'third', 'empty', 'first']) {
        const chat = chats.find((item) => item.id === id)!
        const button = Array.from(
            view.container.querySelectorAll('nav button'),
        ).find((item) => item.textContent?.includes(chat.title))

        expect(button).toBeDefined()

        await act(async () => (button as HTMLButtonElement).click())

        expect(view.container.querySelectorAll('[role="log"]')).toHaveLength(1)
        expect(view.container.querySelectorAll('textarea')).toHaveLength(1)

        const conversation = view.container.querySelector(
            'section[aria-label="Чат"]',
        )!

        expect(conversation.querySelector('h2')?.textContent).toBe(chat.title)
        expect(conversation.querySelectorAll('article')).toHaveLength(
            id === 'empty' ? 0 : 1,
        )
        expect(conversation.textContent?.includes('Начните разговор')).toBe(
            id === 'empty',
        )

        for (const message of messages) {
            expect(conversation.textContent?.includes(message.text)).toBe(
                message.chatId === id,
            )
        }
    }

    expect(errors).not.toHaveBeenCalled()
})
