import type {
    Credentials,
    Notification,
    SendMessageRequest,
    SendMessageResponse,
} from './greenApi.types'

export class ApiError extends Error {
    readonly status: number
    constructor(message: string, status = 0) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

export function isRecord(input: unknown): input is Record<string, unknown> {
    return typeof input === 'object' && input !== null && !Array.isArray(input)
}

export function errorMessage(error: unknown): string {
    return error instanceof Error
        ? error.message
        : 'Не удалось выполнить запрос. Попробуйте ещё раз.'
}

async function request(
    credentials: Credentials,
    method: string,
    signal: AbortSignal,
    options: {
        body?: object
        suffix?: string
        httpMethod?: string
        timeout?: number
    } = {},
): Promise<unknown> {
    const url = `${credentials.apiUrl}/waInstance${encodeURIComponent(credentials.idInstance)}/${method}/${encodeURIComponent(credentials.apiTokenInstance)}${options.suffix ?? ''}`
    try {
        const response = await fetch(url, {
            method: options.httpMethod ?? (options.body ? 'POST' : 'GET'),
            body: options.body ? JSON.stringify(options.body) : undefined,
            headers: options.body
                ? { 'Content-Type': 'application/json' }
                : undefined,
            signal: AbortSignal.any([
                signal,
                AbortSignal.timeout(options.timeout ?? 20_000),
            ]),
            cache: 'no-store',
            credentials: 'omit',
            redirect: 'error',
            referrerPolicy: 'no-referrer',
        })
        if (!response.ok) {
            const messages: Record<number, string> = {
                400: 'Проверьте параметры запроса и настройки инстанса. Для получения сообщений webhookUrl должен быть пустым.',
                401: 'Проверьте idInstance и apiTokenInstance.',
                403: 'Доступ запрещён. Проверьте реквизиты и тариф инстанса.',
                404: 'Инстанс не найден. Проверьте apiUrl и idInstance.',
                429: 'Слишком много запросов. Подождите перед повторной попыткой.',
                469: 'Telegram временно ограничил поиск номера. Повторите позже.',
            }
            throw new ApiError(
                messages[response.status] ??
                    'Сервис временно недоступен. Попробуйте позже.',
                response.status,
            )
        }
        const body = await response.text()
        if (!body.trim()) return null
        try {
            return JSON.parse(body) as unknown
        } catch {
            throw new ApiError('Сервис вернул некорректный ответ.')
        }
    } catch (error) {
        if (signal.aborted || error instanceof ApiError) throw error
        throw new ApiError('Нет ответа от GREEN-API. Проверьте сеть и apiUrl.')
    }
}

export async function verifyCredentials(
    credentials: Credentials,
    signal: AbortSignal,
): Promise<void> {
    const response = await request(credentials, 'getStateInstance', signal)
    if (!isRecord(response) || typeof response.stateInstance !== 'string')
        throw new ApiError('Не удалось проверить состояние инстанса.')
    if (response.stateInstance !== 'authorized')
        throw new ApiError(
            'Инстанс не готов. Авторизуйте Telegram в личном кабинете GREEN-API и проверьте его состояние.',
        )
}

export async function checkAccount(
    credentials: Credentials,
    phone: string,
    signal: AbortSignal,
): Promise<string> {
    const response = await request(credentials, 'checkAccount', signal, {
        body: { phoneNumber: Number(phone) },
    })
    if (isRecord(response) && response.exist === false)
        throw new ApiError(
            'Аккаунт не найден или номер скрыт настройками приватности Telegram.',
        )
    if (
        !isRecord(response) ||
        response.exist !== true ||
        typeof response.chatId !== 'string' ||
        !/^\d+$/.test(response.chatId)
    )
        throw new ApiError(
            'Не удалось найти получателя. Проверьте состояние инстанса и ограничения поиска Telegram.',
        )
    return response.chatId
}

export async function sendMessage(
    credentials: Credentials,
    body: SendMessageRequest,
    signal: AbortSignal,
): Promise<SendMessageResponse> {
    const response = await request(credentials, 'sendMessage', signal, { body })
    if (
        !isRecord(response) ||
        typeof response.idMessage !== 'string' ||
        !response.idMessage
    )
        throw new ApiError('Не удалось подтвердить отправку сообщения.')
    return { idMessage: response.idMessage }
}

export async function receiveNotification(
    credentials: Credentials,
    signal: AbortSignal,
): Promise<Notification | null> {
    const response = await request(credentials, 'receiveNotification', signal, {
        suffix: '?receiveTimeout=25',
        timeout: 35_000,
    })
    if (response === null) return null
    if (
        !isRecord(response) ||
        typeof response.receiptId !== 'number' ||
        !Number.isSafeInteger(response.receiptId) ||
        !isRecord(response.body)
    )
        throw new ApiError('Получено некорректное уведомление.')
    return { receiptId: response.receiptId, body: response.body }
}

export async function deleteNotification(
    credentials: Credentials,
    receiptId: number,
    signal: AbortSignal,
): Promise<void> {
    const response = await request(credentials, 'deleteNotification', signal, {
        httpMethod: 'DELETE',
        suffix: `/${receiptId}`,
    })
    if (!isRecord(response) || response.result !== true)
        throw new ApiError(
            'Не удалось подтвердить обработку уведомления. Проверьте, что инстанс не используется в другой вкладке.',
        )
}
