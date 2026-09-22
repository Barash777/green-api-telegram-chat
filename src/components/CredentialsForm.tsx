import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import type { Credentials } from '../api/greenApi.types'
import { errorMessage, verifyCredentials } from '../api/greenApi'
import { normalizeApiUrl } from '../utils/validation'
import styles from './Chat.module.css'

export function CredentialsForm({
    onConnect,
}: {
    onConnect: (credentials: Credentials) => void
}) {
    const [error, setError] = useState<string | null>(null)
    const [isConnecting, setIsConnecting] = useState(false)
    const request = useRef<AbortController | null>(null)
    useEffect(() => () => request.current?.abort(), [])

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (request.current) return
        const form = new FormData(event.currentTarget)
        const controller = new AbortController()
        request.current = controller
        setIsConnecting(true)
        setError(null)
        try {
            const credentials: Credentials = {
                apiUrl: normalizeApiUrl(String(form.get('apiUrl') ?? '')),
                idInstance: String(form.get('idInstance') ?? '').trim(),
                apiTokenInstance: String(
                    form.get('apiTokenInstance') ?? '',
                ).trim(),
            }
            if (
                !/^\d+$/.test(credentials.idInstance) ||
                !credentials.apiTokenInstance ||
                /\s/.test(credentials.apiTokenInstance)
            )
                throw new Error(
                    'Проверьте idInstance и apiTokenInstance: пробелы не допускаются.',
                )
            await verifyCredentials(credentials, controller.signal)
            if (!controller.signal.aborted) onConnect(credentials)
        } catch (error) {
            if (!controller.signal.aborted) setError(errorMessage(error))
        } finally {
            if (!controller.signal.aborted) setIsConnecting(false)
            if (request.current === controller) request.current = null
        }
    }

    return (
        <main className={styles.login}>
            <section className={styles.loginCard}>
                <div className={styles.logo} aria-hidden="true">
                    ↗
                </div>
                <p className={styles.eyebrow}>GREEN-API / TELEGRAM</p>
                <h1>Ближе к общению.</h1>
                <p className={styles.muted}>
                    Подключите свой аккаунт Telegram и начните переписку.
                </p>
                <form className={styles.form} onSubmit={handleSubmit}>
                    <label>
                        apiUrl
                        <input
                            name="apiUrl"
                            type="url"
                            placeholder="https://…green-api.com"
                            required
                            disabled={isConnecting}
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </label>
                    <label>
                        idInstance
                        <input
                            name="idInstance"
                            inputMode="numeric"
                            pattern="[0-9]+"
                            required
                            disabled={isConnecting}
                            autoComplete="off"
                        />
                    </label>
                    <label>
                        apiTokenInstance
                        <input
                            name="apiTokenInstance"
                            type="password"
                            required
                            disabled={isConnecting}
                            autoComplete="off"
                        />
                    </label>
                    {error && (
                        <p role="alert" className={styles.error}>
                            {error}
                        </p>
                    )}
                    <button className={styles.primary} disabled={isConnecting}>
                        {isConnecting
                            ? 'Проверяем подключение…'
                            : 'Подключиться →'}
                    </button>
                </form>
                <p className={styles.hint}>
                    Реквизиты доступны в{' '}
                    <a
                        href="https://console.green-api.com/"
                        target="_blank"
                        rel="noreferrer"
                    >
                        личном кабинете GREEN-API
                    </a>
                    . Они хранятся только в памяти этой страницы.
                </p>
                <details className={styles.setup}>
                    <summary>Как подготовить инстанс</summary>
                    <p>
                        Авторизуйте Telegram в личном кабинете. В настройках
                        включите входящие уведомления (incomingWebhook) и
                        очистите webhookUrl. Используйте инстанс только в одной
                        вкладке этого чата.
                    </p>
                </details>
            </section>
        </main>
    )
}
