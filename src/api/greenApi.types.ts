export interface Credentials {
    apiUrl: string
    idInstance: string
    apiTokenInstance: string
}

export interface SendMessageRequest {
    chatId: string
    message: string
}

export interface SendMessageResponse {
    idMessage: string
}

export interface Notification {
    receiptId: number
    body: unknown
}
