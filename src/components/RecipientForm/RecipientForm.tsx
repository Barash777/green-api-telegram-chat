import { useState, type SubmitEvent } from 'react'

import styles from './RecipientForm.module.css'
import shared from '../shared.module.css'

interface RecipientFormProps {
    onOpenChat: (phone: string) => Promise<void>
    isOpening: boolean
    error: string | null
}

export function RecipientForm({
    onOpenChat,
    isOpening,
    error,
}: RecipientFormProps) {
    const [phone, setPhone] = useState('')

    async function handleOpenChat(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        await onOpenChat(phone)
    }

    return (
        <form className={styles.recipientForm} onSubmit={handleOpenChat}>
            <label htmlFor="phone">Новый разговор</label>

            <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="Номер с кодом страны"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                required
                disabled={isOpening}
                aria-describedby={error ? 'chat-error' : undefined}
            />

            <button className={shared.primary} disabled={isOpening}>
                {isOpening ? 'Ищем получателя…' : 'Открыть чат'}
            </button>

            {error && (
                <p id="chat-error" role="alert" className={shared.error}>
                    {error}
                </p>
            )}
        </form>
    )
}
