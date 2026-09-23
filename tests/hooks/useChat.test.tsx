// @vitest-environment jsdom
import { act, useLayoutEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, expect, it, vi } from 'vitest'
import { useChat } from '../../src/hooks/useChat'
import { checkAccount, sendMessage } from '../../src/api/greenApi'

vi.mock('../../src/api/pollNotifications', () => ({
    pollNotifications: vi.fn(() => () => {}),
}))
vi.mock('../../src/api/greenApi', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../src/api/greenApi')>()),
    checkAccount: vi.fn(),
    sendMessage: vi.fn(),
}))

const credentials = {
    apiUrl: 'https://test.green-api.com',
    idInstance: '0',
    apiTokenInstance: 'test-token-not-real',
}
afterEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
})

it('keeps a late send error in its original chat and clears it on retry', async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
    vi.mocked(checkAccount)
        .mockResolvedValueOnce('first')
        .mockResolvedValueOnce('second')
    let rejectSend: (error: Error) => void = () => {}
    vi.mocked(sendMessage).mockImplementationOnce(
        () =>
            new Promise((_, reject) => {
                rejectSend = reject
            }),
    )
    let chat: ReturnType<typeof useChat> | undefined
    function Harness() {
        const state = useChat(credentials)
        useLayoutEffect(() => {
            chat = state
        }, [state])
        return null
    }
    function session() {
        if (!chat) throw new Error('Hook has not mounted')
        return chat
    }
    const container = document.createElement('div')
    const root = createRoot(container)
    try {
        await act(async () => root.render(<Harness />))
        await act(async () => session().openChat('12345678901'))
        let pending: Promise<boolean> | undefined
        await act(async () => {
            pending = session().handleSendMessage('Сообщение')
        })
        await act(async () => session().openChat('12345678902'))
        await act(async () => {
            rejectSend(new Error('Сеть недоступна'))
            await pending
        })
        expect(session().activeChatId).toBe('second')
        expect(session().sendError).toBeNull()
        expect(session().messages[0]).toMatchObject({
            chatId: 'first',
            status: 'failed',
        })
        await act(async () => session().setActiveChatId('first'))
        expect(session().sendError).toContain('Сеть недоступна')
        await act(async () => session().setActiveChatId('second'))
        vi.mocked(sendMessage).mockResolvedValueOnce({
            idMessage: 'second-message',
        })
        await act(async () => {
            await session().handleSendMessage('Другой разговор')
        })
        await act(async () => session().setActiveChatId('first'))
        expect(session().sendError).toContain('Сеть недоступна')
        vi.mocked(sendMessage).mockResolvedValueOnce({
            idMessage: 'first-message',
        })
        await act(async () => {
            await session().handleSendMessage('Повтор')
        })
        expect(session().sendError).toBeNull()
    } finally {
        await act(async () => root.unmount())
    }
})
