import type { Chat, Message } from '../../types/message.types'
import styles from './ChatList.module.css'
import shared from '../shared.module.css'

interface ChatListProps {
    chats: Chat[]
    messages: Message[]
    activeChatId: string | null
    onSelectChat: (chatId: string) => void
}

export function ChatList({
    chats,
    messages,
    activeChatId,
    onSelectChat,
}: ChatListProps) {
    return (
        <nav className={styles.chatList} aria-label="Переписки">
            <p className={shared.eyebrow}>ВАШИ СООБЩЕНИЯ</p>
            {chats.length === 0 && (
                <p className={shared.hint}>Здесь появятся ваши разговоры.</p>
            )}
            {chats.map((item) => (
                <button
                    key={item.id}
                    className={`${styles.chatButton} ${item.id === activeChatId ? styles.selected : ''}`}
                    aria-current={item.id === activeChatId ? 'true' : undefined}
                    onClick={() => onSelectChat(item.id)}
                >
                    <span className={styles.avatar} aria-hidden="true">
                        {item.title.slice(0, 1)}
                    </span>
                    <span>
                        <strong>{item.title}</strong>
                        <small>
                            {messages.findLast(
                                (message) => message.chatId === item.id,
                            )?.text ?? 'Пока нет сообщений'}
                        </small>
                    </span>
                </button>
            ))}
        </nav>
    )
}
