export interface Chat {
    id: string
    title: string
    phone?: string
}

export interface Message {
    id: string
    chatId: string
    text: string
    timestamp: number
    direction: 'incoming' | 'outgoing'
    status: 'received' | 'sending' | 'queued' | 'failed'
}
