import { useEffect, useRef, useState, type SubmitEvent } from 'react'
import type { Credentials } from '../api/greenApi.types'
import {
    DEFAULT_API_URL,
    errorMessage,
    verifyCredentials,
    setNotificationSettings,
    waitForNotificationSettings,
} from '../api/greenApi'
import { normalizeApiUrl } from '../utils/validation'
import styles from './Chat.module.css'

export function CredentialsForm({
    onConnect,
}: {
    onConnect: (credentials: Credentials) => void
}) {
    const [error, setError] = useState<string | null>(null)
    const [connectionStage, setConnectionStage] = useState<
        'idle' | 'checking' | 'settings' | 'waiting'
    >('idle')
    const isConnecting = connectionStage !== 'idle'
    const request = useRef<AbortController | null>(null)
    useEffect(() => () => request.current?.abort(), [])

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        if (request.current) return
        const form = new FormData(event.currentTarget)
        const controller = new AbortController()
        request.current = controller
        setConnectionStage('checking')
        setError(null)
        try {
            const credentials: Credentials = {
                apiUrl: normalizeApiUrl(
                    String(form.get('apiUrl') ?? '').trim() || DEFAULT_API_URL,
                ),
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
            if (controller.signal.aborted) return
            if (form.has('configureNotifications')) {
                setConnectionStage('settings')
                await setNotificationSettings(credentials, controller.signal)
                if (controller.signal.aborted) return
                setConnectionStage('waiting')
                await waitForNotificationSettings(
                    credentials,
                    controller.signal,
                )
            }
            if (!controller.signal.aborted) onConnect(credentials)
        } catch (error) {
            if (!controller.signal.aborted) setError(errorMessage(error))
        } finally {
            if (!controller.signal.aborted) setConnectionStage('idle')
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
                    <details className={styles.setup}>
                        <summary>Дополнительные настройки</summary>
                        <label>
                            apiUrl (необязательно)
                            <input
                                name="apiUrl"
                                type="url"
                                placeholder={DEFAULT_API_URL}
                                disabled={isConnecting}
                                autoComplete="off"
                                spellCheck={false}
                                aria-describedby="api-url-hint"
                            />
                        </label>
                        <p id="api-url-hint">
                            Укажите адрес из личного кабинета, только если он
                            отличается от сервера по умолчанию.
                        </p>
                    </details>
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            name="configureNotifications"
                            disabled={isConnecting}
                        />
                        Установить настройки для получения сообщения
                    </label>
                    {error && (
                        <p role="alert" className={styles.error}>
                            {error}
                        </p>
                    )}
                    <button className={styles.primary} disabled={isConnecting}>
                        {
                            {
                                idle: 'Подключиться →',
                                checking: 'Проверяем подключение…',
                                settings: 'Настраиваем уведомления…',
                                waiting: 'Ожидаем готовности…',
                            }[connectionStage]
                        }
                    </button>
                    {connectionStage === 'waiting' && (
                        <p role="status" className={styles.hint}>
                            Настройки сохранены. Инстанс перезапускается;
                            подключение может занять до 5 минут.
                        </p>
                    )}
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
                        Авторизуйте Telegram в личном кабинете. Чтобы включить
                        уведомления и очистить webhookUrl, отметьте чекбокс
                        установки настроек. Без него текущие настройки инстанса
                        сохраняются. Используйте инстанс только в одной вкладке.
                    </p>
                </details>
            </section>
        </main>
    )
}
