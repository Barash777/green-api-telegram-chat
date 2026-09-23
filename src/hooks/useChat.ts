import { useEffect, useRef, useState } from 'react'
import type { Credentials } from '../types/greenApi.types'
import { checkAccount, errorMessage, sendMessage } from '../api/greenApi'
import { mapIncomingMessage } from '../api/notification'
import { pollNotifications } from '../api/pollNotifications'
import type { Chat, Message } from '../types/message.types'
import { normalizePhone } from '../utils/validation'

export function useChat(credentials: Credentials) {
    const [chats, setChats] = useState<Chat[]>([])
    const [activeChatId, setActiveChatId] = useState<string | null>(null)
    const [messages, setMessages] = useState<Message[]>([])
    const [receiveError, setReceiveError] = useState<string | null>(null)
    const [isReceiving, setIsReceiving] = useState(false)
    const [isSending, setIsSending] = useState(false)
    const [isOpening, setIsOpening] = useState(false)
    const [chatError, setChatError] = useState<string | null>(null)
    const [sendErrors, setSendErrors] = useState<
        Record<string, string | undefined>
    >({})
    const sendController = useRef<AbortController | null>(null)
    const openController = useRef<AbortController | null>(null)

    useEffect(() => {
        const stop = pollNotifications(
            credentials,
            (notification) => {
                const incoming = mapIncomingMessage(notification.body)
                if (!incoming) return
                setChats((current) =>
                    current.some((chat) => chat.id === incoming.chat.id)
                        ? current
                        : [...current, incoming.chat],
                )
                setMessages((current) =>
                    current.some(
                        (message) =>
                            message.chatId === incoming.message.chatId &&
                            message.id === incoming.message.id,
                    )
                        ? current
                        : [...current, incoming.message],
                )
            },
            (error) => {
                setReceiveError(error)
                setIsReceiving(!error)
            },
        )
        return () => {
            stop()
            sendController.current?.abort()
            openController.current?.abort()
        }
    }, [credentials])

    async function openChat(input: string) {
        if (openController.current) return
        const controller = new AbortController()
        openController.current = controller
        setChatError(null)
        setIsOpening(true)
        try {
            const phone = normalizePhone(input)
            const existing = chats.find((chat) => chat.phone === phone)
            const id =
                existing?.id ??
                (await checkAccount(credentials, phone, controller.signal))
            if (controller.signal.aborted) return
            setChats((current) => {
                const chat = current.find((item) => item.id === id)
                return chat
                    ? current.map((item) =>
                          item.id === id ? { ...item, phone } : item,
                      )
                    : [...current, { id, title: `+${phone}`, phone }]
            })
            setActiveChatId(id)
        } catch (error) {
            if (!controller.signal.aborted) setChatError(errorMessage(error))
        } finally {
            if (!controller.signal.aborted) setIsOpening(false)
            if (openController.current === controller)
                openController.current = null
        }
    }

    async function handleSendMessage(input: string): Promise<boolean> {
        const text = input.trim()
        if (
            !activeChatId ||
            !text ||
            text.length > 4096 ||
            sendController.current
        )
            return false
        const controller = new AbortController()
        sendController.current = controller
        const localId = crypto.randomUUID()
        const chatId = activeChatId
        setIsSending(true)
        setSendErrors((current) => ({ ...current, [chatId]: undefined }))
        setMessages((current) => [
            ...current,
            {
                id: localId,
                chatId,
                text,
                timestamp: Date.now(),
                direction: 'outgoing',
                status: 'sending',
            },
        ])
        try {
            const response = await sendMessage(
                credentials,
                { chatId, message: text },
                controller.signal,
            )
            if (controller.signal.aborted) return false
            setMessages((current) =>
                current.map((message) =>
                    message.id === localId
                        ? {
                              ...message,
                              id: response.idMessage,
                              status: 'queued',
                          }
                        : message,
                ),
            )
            return true
        } catch (error) {
            if (!controller.signal.aborted) {
                setMessages((current) =>
                    current.map((message) =>
                        message.id === localId
                            ? { ...message, status: 'failed' }
                            : message,
                    ),
                )
                setSendErrors((current) => ({
                    ...current,
                    [chatId]: `${errorMessage(error)} Отправка не подтверждена. Перед повтором проверьте Telegram, чтобы избежать дубля.`,
                }))
            }
            return false
        } finally {
            if (!controller.signal.aborted) setIsSending(false)
            if (sendController.current === controller)
                sendController.current = null
        }
    }

    return {
        chats,
        activeChatId,
        setActiveChatId,
        messages,
        receiveError,
        isReceiving,
        isSending,
        isOpening,
        chatError,
        sendError: activeChatId ? (sendErrors[activeChatId] ?? null) : null,
        openChat,
        handleSendMessage,
    }
}
