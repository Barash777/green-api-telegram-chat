import { useLayoutEffect, useRef } from 'react'
import type { Message } from '../types/message'
import styles from './Chat.module.css'

const timeFormatter = new Intl.DateTimeFormat('ru', {
    hour: '2-digit',
    minute: '2-digit',
})
const dateFormatter = new Intl.DateTimeFormat('ru', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
})
const statuses = {
    sending: 'Отправляется…',
    queued: 'В очереди GREEN-API',
    failed: 'Отправка не подтверждена',
    received: '',
}

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
                <div className={styles.empty}>
                    <span className={styles.emptyIcon} aria-hidden="true">
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
                        <article
                            className={`${styles.message} ${message.direction === 'outgoing' ? styles.outgoing : styles.incoming}`}
                        >
                            <span className={styles.srOnly}>
                                {message.direction === 'outgoing'
                                    ? 'Вы: '
                                    : 'Собеседник: '}
                            </span>
                            <p>{message.text}</p>
                            <footer
                                className={
                                    message.status === 'failed'
                                        ? styles.failed
                                        : undefined
                                }
                            >
                                <time
                                    dateTime={new Date(
                                        message.timestamp,
                                    ).toISOString()}
                                >
                                    {timeFormatter.format(message.timestamp)}
                                </time>
                                {message.direction === 'outgoing' && (
                                    <span>{statuses[message.status]}</span>
                                )}
                            </footer>
                        </article>
                    </div>
                )
            })}
        </div>
    )
}
