import { useLayoutEffect, useRef } from 'react'
import { MessageItem } from '../MessageItem/MessageItem'
import type { Message } from '../../types/message.types'
import styles from './MessageList.module.css'
import shared from '../shared.module.css'

const dateFormatter = new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
})
export function MessageList({ messages }: { messages: Message[] }) {
    const container = useRef<HTMLDivElement>(null)
    const nearBottom = useRef(true)
    useLayoutEffect(() => {
        const element = container.current
        if (element && nearBottom.current)
            element.scrollTop = element.scrollHeight
    }, [messages])

    return (
        <div
            ref={container}
            className={styles.messages}
            role="log"
            aria-label="Сообщения"
            aria-live="polite"
            aria-relevant="additions text"
            onScroll={() => {
                const element = container.current
                if (element)
                    nearBottom.current =
                        element.scrollHeight -
                            element.scrollTop -
                            element.clientHeight <
                        100
            }}
        >
            {messages.length === 0 && (
                <div className={`${shared.empty} ${styles.emptyState}`}>
                    <span className={shared.emptyIcon} aria-hidden="true">
                        ↗
                    </span>
                    <h2>Начните разговор</h2>
                    <p>
                        Напишите первое сообщение.
                        <br />
                        Ответ появится здесь автоматически.
                    </p>
                </div>
            )}
            {messages.map((message, index) => {
                const date = dateFormatter.format(message.timestamp)
                const previous = messages[index - 1]
                return (
                    <div key={`${message.direction}:${message.id}`}>
                        {(!previous ||
                            dateFormatter.format(previous.timestamp) !==
                                date) && <p className={styles.date}>{date}</p>}
                        <MessageItem message={message} />
                    </div>
                )
            })}
        </div>
    )
}
