import type { Message } from '../../types/message.types'

import styles from './MessageItem.module.css'
import shared from '../shared.module.css'

const timeFormatter = new Intl.DateTimeFormat('ru', {
    hour: '2-digit',
    minute: '2-digit',
})

const statuses = {
    sending: 'Отправляется…',
    queued: 'В очереди GREEN-API',
    failed: 'Отправка не подтверждена',
    received: '',
}

export function MessageItem({ message }: { message: Message }) {
    return (
        <article
            className={`${styles.message} ${message.direction === 'outgoing' ? styles.outgoing : styles.incoming}`}
        >
            <span className={shared.srOnly}>
                {message.direction === 'outgoing' ? 'Вы: ' : 'Собеседник: '}
            </span>

            <p>{message.text}</p>

            <footer
                className={
                    message.status === 'failed' ? styles.failed : undefined
                }
            >
                <time dateTime={new Date(message.timestamp).toISOString()}>
                    {timeFormatter.format(message.timestamp)}
                </time>

                {message.direction === 'outgoing' && (
                    <span>{statuses[message.status]}</span>
                )}
            </footer>
        </article>
    )
}
