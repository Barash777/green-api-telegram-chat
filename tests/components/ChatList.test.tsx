// @vitest-environment jsdom
import { act } from 'react'
import { expect, it, vi } from 'vitest'

import { ChatList } from '../../src/components/ChatList/ChatList'
import { setupComponentTest } from '../helpers/component'

const view = setupComponentTest()

it('explains the empty chat list', async () => {
    await view.render(
        <ChatList
            chats={[]}
            messages={[]}
            activeChatId={null}
            onSelectChat={vi.fn()}
        />,
    )

    expect(view.container.textContent).toContain(
        'Здесь появятся ваши разговоры.',
    )
    expect(view.container.querySelectorAll('button')).toHaveLength(0)
})

it('shows each chat’s latest message and selects the requested chat', async () => {
    const onSelectChat = vi.fn()
    const chats = [
        { id: '42', title: 'Анна' },
        { id: '43', title: 'Борис' },
    ]
    const messages = ['Первое', 'Последнее'].map((text, index) => ({
        id: String(index),
        chatId: '42',
        text,
        timestamp: index,
        direction: 'incoming' as const,
        status: 'received' as const,
    }))

    await view.render(
        <ChatList
            chats={chats}
            messages={messages}
            activeChatId="42"
            onSelectChat={onSelectChat}
        />,
    )

    const buttons = view.container.querySelectorAll('button')

    expect(buttons[0].getAttribute('aria-current')).toBe('true')
    expect(buttons[0].querySelector('small')?.textContent).toBe('Последнее')
    expect(buttons[1].getAttribute('aria-current')).toBeNull()
    expect(buttons[1].querySelector('small')?.textContent).toBe(
        'Пока нет сообщений',
    )

    await act(async () => buttons[1].click())

    expect(onSelectChat).toHaveBeenCalledExactlyOnceWith('43')
})
