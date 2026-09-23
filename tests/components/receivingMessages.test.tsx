// @vitest-environment jsdom
import { act, StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'

import { ChatWorkspace } from '../../src/components/ChatWorkspace/ChatWorkspace'

const credentials = {
    apiUrl: 'https://test.green-api.com',
    idInstance: '0',
    apiTokenInstance: 'test-token-not-real',
}

afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
})

it('receives and acknowledges messages across chat switches with one StrictMode polling loop', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)

    const notifications = [
        { receiptId: 1, chatId: '42', text: 'Первое сообщение' },
        { receiptId: 2, chatId: '43', text: 'Другой чат' },
        { receiptId: 3, chatId: '42', text: 'Новый ответ' },
    ]
    let nextNotification = 0
    const receivedSignals: AbortSignal[] = []
    const acknowledged: string[] = []

    const fetchMock = vi.fn(async (url: string, options: RequestInit) => {
        const path = new URL(url).pathname

        if (path.includes('/receiveNotification/')) {
            receivedSignals.push(options.signal as AbortSignal)

            const notification = notifications[nextNotification++]

            return new Response(
                JSON.stringify(
                    notification
                        ? {
                              receiptId: notification.receiptId,
                              body: {
                                  typeWebhook: 'incomingMessageReceived',
                                  idMessage: String(notification.receiptId),
                                  timestamp: 1700000000,
                                  senderData: {
                                      chatId: notification.chatId,
                                      chatName: `Чат ${notification.chatId}`,
                                  },
                                  messageData: {
                                      typeMessage: 'textMessage',
                                      textMessageData: {
                                          textMessage: notification.text,
                                      },
                                  },
                              },
                          }
                        : null,
                ),
            )
        }

        if (
            path.includes('/deleteNotification/') &&
            options.method === 'DELETE'
        ) {
            acknowledged.push(path.split('/').at(-1)!)

            return new Response(JSON.stringify({ result: true }))
        }

        throw new Error('Unexpected API request')
    })
    vi.stubGlobal('fetch', fetchMock)

    const container = document.createElement('div')
    const root = createRoot(container)

    async function selectChat(id: string) {
        const button = Array.from(
            container.querySelectorAll('nav button'),
        ).find((element) => element.textContent?.includes(`Чат ${id}`))

        expect(button).toBeDefined()

        await act(async () => (button as HTMLButtonElement).click())
    }

    try {
        await act(async () => {
            root.render(
                <StrictMode>
                    <ChatWorkspace
                        credentials={credentials}
                        onDisconnect={() => {}}
                    />
                </StrictMode>,
            )
        })
        await act(async () => vi.advanceTimersByTimeAsync(0))

        expect(receivedSignals).toHaveLength(1)

        await selectChat('42')

        expect(container.querySelector('[role="log"]')?.textContent).toContain(
            'Первое сообщение',
        )

        await act(async () => vi.advanceTimersByTimeAsync(500))
        await selectChat('43')
        await act(async () => vi.advanceTimersByTimeAsync(500))

        expect(container.querySelector('[role="log"]')?.textContent).toContain(
            'Другой чат',
        )
        expect(
            container.querySelector('[role="log"]')?.textContent,
        ).not.toContain('Новый ответ')

        await selectChat('42')

        expect(container.querySelector('[role="log"]')?.textContent).toContain(
            'Новый ответ',
        )
        expect(acknowledged).toEqual(['1', '2', '3'])
        expect(receivedSignals).toHaveLength(3)
        expect(container.querySelector('[role="alert"]')).toBeNull()
    } finally {
        await act(async () => root.unmount())
    }

    expect(receivedSignals.every((signal) => signal.aborted)).toBe(true)

    const requestsBeforeUnmount = fetchMock.mock.calls.length

    await vi.advanceTimersByTimeAsync(60_000)

    expect(fetchMock).toHaveBeenCalledTimes(requestsBeforeUnmount)
})
