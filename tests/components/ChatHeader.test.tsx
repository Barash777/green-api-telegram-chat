// @vitest-environment jsdom
import { act } from 'react'
import { expect, it, vi } from 'vitest'

import { ChatHeader } from '../../src/components/ChatHeader/ChatHeader'
import { setupComponentTest } from '../helpers/component'

const view = setupComponentTest()

it.each([
    [false, false, 'Подключаем получение…'],
    [false, true, 'Ожидаем новые сообщения'],
    [true, false, 'Получение приостановлено'],
    [true, true, 'Получение приостановлено'],
])(
    'shows connection status (error: %s, receiving: %s)',
    async (hasReceiveError, isReceiving, status) => {
        await view.render(
            <ChatHeader
                activeChat={undefined}
                hasReceiveError={hasReceiveError}
                isReceiving={isReceiving}
                onBack={vi.fn()}
            />,
        )

        expect(
            view.container.querySelector('[role="status"]')?.textContent,
        ).toBe(status)
        expect(view.container.querySelector('h2')?.textContent).toBe(
            'Ваши разговоры',
        )
        expect(view.container.querySelector('button')).toBeNull()
    },
)

it('shows the selected chat and returns to the chat list', async () => {
    const onBack = vi.fn()

    await view.render(
        <ChatHeader
            activeChat={{ id: '42', title: 'Анна' }}
            hasReceiveError={false}
            isReceiving
            onBack={onBack}
        />,
    )

    expect(view.container.querySelector('h2')?.textContent).toBe('Анна')

    await act(async () =>
        view.container
            .querySelector<HTMLButtonElement>('[aria-label="К списку чатов"]')!
            .click(),
    )

    expect(onBack).toHaveBeenCalledOnce()
})
