import { useState } from 'react'
import type { Credentials } from './types/greenApi.types'
import { CredentialsForm } from './components/CredentialsForm/CredentialsForm'
import { ChatWorkspace } from './components/ChatWorkspace/ChatWorkspace'

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
