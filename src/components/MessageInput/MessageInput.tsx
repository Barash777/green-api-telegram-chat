import { useRef, useState, type SubmitEvent } from 'react'
import styles from './MessageInput.module.css'
import shared from '../shared.module.css'

export function MessageInput({
    onSend,
    isSending,
}: {
    onSend: (text: string) => Promise<boolean>
    isSending: boolean
}) {
    const [text, setText] = useState('')
    const input = useRef<HTMLTextAreaElement>(null)
    const submitting = useRef(false)
    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (submitting.current || isSending || !text.trim()) return
        submitting.current = true
        try {
            if (await onSend(text)) setText('')
        } finally {
            submitting.current = false
            input.current?.focus()
        }
    }
    return (
        <form className={styles.composer} onSubmit={handleSubmit}>
            <label className={shared.srOnly} htmlFor="message">
                Сообщение
            </label>
            <textarea
                id="message"
                ref={input}
                value={text}
                onChange={(event) => setText(event.target.value)}
                maxLength={4096}
                readOnly={isSending}
                rows={2}
                placeholder="Напишите сообщение…"
                onKeyDown={(event) => {
                    if (
                        event.key === 'Enter' &&
                        !event.shiftKey &&
                        !event.nativeEvent.isComposing
                    ) {
                        event.preventDefault()
                        event.currentTarget.form?.requestSubmit()
                    }
                }}
            />
            <button
                className={styles.send}
                disabled={isSending || !text.trim()}
                aria-label={isSending ? 'Отправляется' : 'Отправить сообщение'}
            >
                {isSending ? '…' : '↑'}
            </button>
            <small>Enter — отправить · Shift + Enter — новая строка</small>
        </form>
    )
}
