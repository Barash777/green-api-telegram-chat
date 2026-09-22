import { useState, type SubmitEvent } from 'react'
import type { Credentials } from '../api/greenApi.types'
import { useMessages } from '../hooks/useMessages'
import { MessageInput } from './MessageInput'
import { MessageList } from './MessageList'
import styles from './Chat.module.css'

export function ChatWorkspace({
    credentials,
    onDisconnect,
}: {
    credentials: Credentials
    onDisconnect: () => void
}) {
    const chat = useMessages(credentials)
    const [phone, setPhone] = useState('')
    const activeChat = chat.chats.find((item) => item.id === chat.activeChatId)
    const messages = chat.messages
        .filter((message) => message.chatId === chat.activeChatId)
        .sort((a, b) => a.timestamp - b.timestamp)

    async function handleOpenChat(event: SubmitEvent<HTMLFormElement>) {
        event.preventDefault()
        await chat.openChat(phone)
    }

    return (
        <main
            className={`${styles.workspace} ${activeChat ? styles.hasChat : ''}`}
        >
            <aside className={styles.sidebar}>
                <header className={styles.sidebarHeader}>
                    <div className={styles.logo} aria-hidden="true">
                        ↗
                    </div>
                    <div>
                        <h1>Telegram</h1>
                        <span className={styles.muted}>через GREEN-API</span>
                    </div>
                </header>
                <form
                    className={styles.recipientForm}
                    onSubmit={handleOpenChat}
                >
                    <label htmlFor="phone">Новый разговор</label>
                    <input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="Номер с кодом страны"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value)}
                        required
                        disabled={chat.isOpening}
                        aria-describedby={
                            chat.chatError ? 'chat-error' : undefined
                        }
                    />
                    <button
                        className={styles.primary}
                        disabled={chat.isOpening}
                    >
                        {chat.isOpening ? 'Ищем получателя…' : 'Открыть чат'}
                    </button>
                    {chat.chatError && (
                        <p
                            id="chat-error"
                            role="alert"
                            className={styles.error}
                        >
                            {chat.chatError}
                        </p>
                    )}
                </form>
                {!activeChat && chat.receiveError && (
                    <p role="alert" className={styles.banner}>
                        {chat.receiveError}
                    </p>
                )}
                <nav className={styles.chatList} aria-label="Переписки">
                    <p className={styles.eyebrow}>ВАШИ СООБЩЕНИЯ</p>
                    {chat.chats.length === 0 && (
                        <p className={styles.hint}>
                            Здесь появятся ваши разговоры.
                        </p>
                    )}
                    {chat.chats.map((item) => (
                        <button
                            key={item.id}
                            className={`${styles.chatButton} ${item.id === chat.activeChatId ? styles.selected : ''}`}
                            aria-current={
                                item.id === chat.activeChatId
                                    ? 'true'
                                    : undefined
                            }
                            onClick={() => chat.setActiveChatId(item.id)}
                        >
                            <span className={styles.avatar} aria-hidden="true">
                                {item.title.slice(0, 1)}
                            </span>
                            <span>
                                <strong>{item.title}</strong>
                                <small>
                                    {chat.messages.findLast(
                                        (message) => message.chatId === item.id,
                                    )?.text ?? 'Пока нет сообщений'}
                                </small>
                            </span>
                        </button>
                    ))}
                </nav>
                <footer className={styles.sidebarFooter}>
                    <p className={styles.hint}>
                        История хранится до выхода или обновления страницы.
                    </p>
                    <button
                        className={styles.textButton}
                        onClick={onDisconnect}
                    >
                        Отключиться
                    </button>
                </footer>
            </aside>
            <section className={styles.conversation} aria-label="Чат">
                <header className={styles.chatHeader}>
                    {activeChat && (
                        <button
                            className={styles.back}
                            onClick={() => chat.setActiveChatId(null)}
                            aria-label="К списку чатов"
                        >
                            ←
                        </button>
                    )}
                    <div>
                        <h2>{activeChat?.title ?? 'Ваши разговоры'}</h2>
                        <p role="status" className={styles.connection}>
                            {chat.receiveError
                                ? 'Получение приостановлено'
                                : chat.isReceiving
                                  ? 'Ожидаем новые сообщения'
                                  : 'Подключаем получение…'}
                        </p>
                    </div>
                    <span className={styles.badge}>TELEGRAM</span>
                </header>
                {activeChat && chat.receiveError && (
                    <p role="alert" className={styles.banner}>
                        {chat.receiveError}
                    </p>
                )}
                {activeChat ? (
                    <>
                        <MessageList
                            key={`messages:${activeChat.id}`}
                            messages={messages}
                        />
                        {chat.sendError && (
                            <p role="alert" className={styles.banner}>
                                {chat.sendError}
                            </p>
                        )}
                        <MessageInput
                            key={`composer:${activeChat.id}`}
                            onSend={chat.handleSendMessage}
                            isSending={chat.isSending}
                        />
                    </>
                ) : (
                    <div className={styles.empty}>
                        <span className={styles.emptyIcon} aria-hidden="true">
                            ↗
                        </span>
                        <h2>
                            Хороший разговор
                            <br />
                            начинается с «Привет».
                        </h2>
                        <p>
                            Введите номер телефона или выберите чат слева,
                            <br />
                            чтобы начать переписку в Telegram.
                        </p>
                    </div>
                )}
            </section>
        </main>
    )
}
