import type { SubmitEvent } from 'react'

import { DEFAULT_API_URL } from '../../api/greenApi'
import { useConnection } from '../../hooks/useConnection'

import type { Credentials } from '../../types/greenApi.types'

import styles from './CredentialsForm.module.css'
import shared from '../shared.module.css'

interface CredentialsFormProps {
    onConnect: (credentials: Credentials) => void
}

export function CredentialsForm({ onConnect }: CredentialsFormProps) {
    const { error, connectionStage, isConnecting, connect } =
        useConnection(onConnect)

    async function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()

        const form = new FormData(event.currentTarget)

        await connect(
            {
                apiUrl:
                    String(form.get('apiUrl') ?? '').trim() || DEFAULT_API_URL,
                idInstance: String(form.get('idInstance') ?? ''),
                apiTokenInstance: String(form.get('apiTokenInstance') ?? ''),
            },
            form.has('configureNotifications'),
        )
    }

    return (
        <main className={styles.login}>
            <section className={styles.loginCard}>
                <div
                    className={`${shared.logo} ${styles.loginLogo}`}
                    aria-hidden="true"
                >
                    ↗
                </div>

                <p className={shared.eyebrow}>GREEN-API / TELEGRAM</p>
                <h1>Ближе к общению.</h1>

                <p className={shared.muted}>
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
                        <p role="alert" className={shared.error}>
                            {error}
                        </p>
                    )}

                    <button className={shared.primary} disabled={isConnecting}>
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
                        <p role="status" className={shared.hint}>
                            Настройки сохранены. Инстанс перезапускается;
                            подключение может занять до 5 минут.
                        </p>
                    )}
                </form>

                <p className={shared.hint}>
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
