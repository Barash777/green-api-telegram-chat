import type { Chat, Message } from '../types/message.types'
import { ApiError, isRecord } from './greenApi'

export function mapIncomingMessage(
    body: unknown,
): { chat: Chat; message: Message } | null {
    if (!isRecord(body) || body.typeWebhook !== 'incomingMessageReceived')
        return null
    const sender = body.senderData
    const content = body.messageData
    if (!isRecord(content))
        throw new ApiError('В уведомлении отсутствует содержимое сообщения.')
    if (
        content.typeMessage !== 'textMessage' &&
        content.typeMessage !== 'extendedTextMessage'
    )
        return null
    const text =
        content.typeMessage === 'textMessage'
            ? isRecord(content.textMessageData)
                ? content.textMessageData.textMessage
                : undefined
            : isRecord(content.extendedTextMessageData)
              ? content.extendedTextMessageData.text
              : undefined
    if (
        !isRecord(sender) ||
        typeof sender.chatId !== 'string' ||
        !sender.chatId ||
        typeof body.idMessage !== 'string' ||
        !body.idMessage ||
        typeof text !== 'string' ||
        typeof body.timestamp !== 'number' ||
        !Number.isFinite(body.timestamp) ||
        body.timestamp < 0 ||
        body.timestamp > 8.64e12
    ) {
        throw new ApiError(
            'Не удалось прочитать текстовое уведомление. Оно сохранено в очереди.',
        )
    }
    return {
        chat: {
            id: sender.chatId,
            title:
                typeof sender.chatName === 'string' && sender.chatName
                    ? sender.chatName
                    : sender.chatId,
        },
        message: {
            id: body.idMessage,
            chatId: sender.chatId,
            text,
            timestamp: body.timestamp * 1000,
            direction: 'incoming',
            status: 'received',
        },
    }
}
