import { useState } from 'react'
import type { Credentials } from './api/greenApi.types'
import { CredentialsForm } from './components/CredentialsForm'
import { ChatWorkspace } from './components/ChatWorkspace'

export default function App() {
    const [credentials, setCredentials] = useState<Credentials | null>(null)
    return credentials ? (
        <ChatWorkspace
            credentials={credentials}
            onDisconnect={() => setCredentials(null)}
        />
    ) : (
        <CredentialsForm onConnect={setCredentials} />
    )
}
