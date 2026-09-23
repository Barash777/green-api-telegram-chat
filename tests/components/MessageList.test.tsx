// @vitest-environment jsdom
import { act } from 'react'
import { expect, it } from 'vitest'

import { MessageList } from '../../src/components/MessageList/MessageList'
import { setupComponentTest } from '../helpers/component'

import type { Message } from '../../src/types/message.types'

const view = setupComponentTest()
const messages: Message[] = [
    {
        id: '1',
        chatId: '42',
        text: 'Первое',
        timestamp: new Date(2026, 0, 1, 12).getTime(),
        direction: 'incoming',
        status: 'received',
    },
    {
        id: '2',
        chatId: '42',
        text: 'Второе',
        timestamp: new Date(2026, 0, 1, 13).getTime(),
        direction: 'outgoing',
        status: 'queued',
    },
    {
        id: '3',
        chatId: '42',
        text: 'На следующий день',
        timestamp: new Date(2026, 0, 2, 12).getTime(),
        direction: 'incoming',
        status: 'received',
    },
]

it('shows an empty conversation prompt', async () => {
    await view.render(<MessageList messages={[]} />)

    expect(view.container.querySelector('[role="log"]')?.textContent).toContain(
        'Начните разговор',
    )
    expect(view.container.querySelector('article')).toBeNull()
})

it('shows messages in order with one date heading per day', async () => {
    await view.render(<MessageList messages={messages} />)

    expect(
        Array.from(
            view.container.querySelectorAll('article p'),
            (element) => element.textContent,
        ),
    ).toEqual(messages.map((message) => message.text))

    const headings = view.container.querySelectorAll('[role="log"] > div > p')
    const formatter = new Intl.DateTimeFormat('ru', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })

    expect(Array.from(headings, (element) => element.textContent)).toEqual([
        formatter.format(messages[0].timestamp),
        formatter.format(messages[2].timestamp),
    ])
    expect(view.container.textContent).not.toContain('Начните разговор')
})

it('follows new messages near the bottom but preserves the position while reading history', async () => {
    await view.render(<MessageList messages={messages.slice(0, 1)} />)

    const log = view.container.querySelector<HTMLDivElement>('[role="log"]')!

    Object.defineProperties(log, {
        scrollHeight: { configurable: true, value: 1000 },
        clientHeight: { configurable: true, value: 200 },
    })

    await view.render(<MessageList messages={messages.slice(0, 2)} />)

    expect(log.scrollTop).toBe(1000)

    await act(async () => {
        log.scrollTop = 100
        log.dispatchEvent(new Event('scroll'))
    })
    await view.render(<MessageList messages={messages} />)

    expect(log.scrollTop).toBe(100)

    await act(async () => {
        log.scrollTop = 800
        log.dispatchEvent(new Event('scroll'))
    })
    Object.defineProperty(log, 'scrollHeight', { value: 1200 })

    await view.render(
        <MessageList
            messages={[
                ...messages,
                { ...messages[2], id: '4', text: 'Ещё ответ' },
            ]}
        />,
    )

    expect(log.scrollTop).toBe(1200)
})
