import type { Chat } from '../../types/message.types'

import styles from './ChatHeader.module.css'

interface ChatHeaderProps {
    activeChat: Chat | undefined
    hasReceiveError: boolean
    isReceiving: boolean
    onBack: () => void
}

export function ChatHeader({
    activeChat,
    hasReceiveError,
    isReceiving,
    onBack,
}: ChatHeaderProps) {
    return (
        <header className={styles.chatHeader}>
            {activeChat && (
                <button
                    className={styles.back}
                    onClick={onBack}
                    aria-label="К списку чатов"
                >
                    ←
                </button>
            )}

            <div>
                <h2>{activeChat?.title ?? 'Ваши разговоры'}</h2>

                <p role="status" className={styles.connection}>
                    {hasReceiveError
                        ? 'Получение приостановлено'
                        : isReceiving
                          ? 'Ожидаем новые сообщения'
                          : 'Подключаем получение…'}
                </p>
            </div>

            <span className={styles.badge}>TELEGRAM</span>
        </header>
    )
}
