// @vitest-environment jsdom
import { expect, it } from 'vitest'

import { MessageItem } from '../../src/components/MessageItem/MessageItem'
import { setupComponentTest } from '../helpers/component'

const view = setupComponentTest()
const message = {
    id: '1',
    chatId: '42',
    text: '<script>alert("hello")</script>\nВторая строка',
    timestamp: 1700000000000,
    direction: 'incoming' as const,
    status: 'received' as const,
}

it('renders incoming text safely, with its author and machine-readable timestamp', async () => {
    await view.render(<MessageItem message={message} />)

    expect(view.container.querySelector('p')?.textContent).toBe(message.text)
    expect(view.container.querySelector('script')).toBeNull()
    expect(view.container.querySelector('article')?.textContent).toContain(
        'Собеседник: ',
    )
    expect(view.container.querySelector('time')?.dateTime).toBe(
        new Date(message.timestamp).toISOString(),
    )
    expect(view.container.querySelector('footer span')).toBeNull()
})

it.each([
    ['sending', 'Отправляется…'],
    ['queued', 'В очереди GREEN-API'],
    ['failed', 'Отправка не подтверждена'],
] as const)('shows the outgoing %s status', async (status, label) => {
    await view.render(
        <MessageItem message={{ ...message, direction: 'outgoing', status }} />,
    )

    expect(view.container.querySelector('article')?.textContent).toContain(
        'Вы: ',
    )
    expect(view.container.querySelector('footer span')?.textContent).toBe(label)
})
