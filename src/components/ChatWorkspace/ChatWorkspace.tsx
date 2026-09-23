import { useChat } from '../../hooks/useChat'
import { MessageInput } from '../MessageInput/MessageInput'
import { MessageList } from '../MessageList/MessageList'
import { RecipientForm } from '../RecipientForm/RecipientForm'
import { ChatList } from '../ChatList/ChatList'
import { ChatHeader } from '../ChatHeader/ChatHeader'

import type { Credentials } from '../../types/greenApi.types'

import styles from './ChatWorkspace.module.css'
import shared from '../shared.module.css'

interface ChatWorkspaceProps {
    credentials: Credentials
    onDisconnect: () => void
}

export function ChatWorkspace({
    credentials,
    onDisconnect,
}: ChatWorkspaceProps) {
    const chat = useChat(credentials)
    const activeChat = chat.chats.find((item) => item.id === chat.activeChatId)
    const messages = chat.messages
        .filter((message) => message.chatId === chat.activeChatId)
        .sort((a, b) => a.timestamp - b.timestamp)

    return (
        <main
            className={`${styles.workspace} ${activeChat ? styles.hasChat : ''}`}
        >
            <aside className={styles.sidebar}>
                <header className={styles.sidebarHeader}>
                    <div className={shared.logo} aria-hidden="true">
                        ↗
                    </div>

                    <div>
                        <h1>Telegram</h1>
                        <span className={shared.muted}>через GREEN-API</span>
                    </div>
                </header>

                <RecipientForm
                    onOpenChat={chat.openChat}
                    isOpening={chat.isOpening}
                    error={chat.chatError}
                />

                {!activeChat && chat.receiveError && (
                    <p role="alert" className={shared.banner}>
                        {chat.receiveError}
                    </p>
                )}

                <ChatList
                    chats={chat.chats}
                    messages={chat.messages}
                    activeChatId={chat.activeChatId}
                    onSelectChat={chat.setActiveChatId}
                />

                <footer className={styles.sidebarFooter}>
                    <p className={shared.hint}>
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
                <ChatHeader
                    activeChat={activeChat}
                    hasReceiveError={Boolean(chat.receiveError)}
                    isReceiving={chat.isReceiving}
                    onBack={() => chat.setActiveChatId(null)}
                />

                {activeChat && chat.receiveError && (
                    <p role="alert" className={shared.banner}>
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
                            <p role="alert" className={shared.banner}>
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
                    <div className={shared.empty}>
                        <span className={shared.emptyIcon} aria-hidden="true">
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
