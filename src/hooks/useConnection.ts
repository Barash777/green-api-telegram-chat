import { useEffect, useRef, useState } from 'react'

import {
    errorMessage,
    verifyCredentials,
    setNotificationSettings,
    waitForNotificationSettings,
} from '../api/greenApi'
import { normalizeCredentials } from '../utils/validation'

import type { Credentials } from '../types/greenApi.types'

type ConnectionStage = 'idle' | 'checking' | 'settings' | 'waiting'

export function useConnection(onConnect: (credentials: Credentials) => void) {
    const [error, setError] = useState<string | null>(null)
    const [connectionStage, setConnectionStage] =
        useState<ConnectionStage>('idle')

    const isConnecting = connectionStage !== 'idle'

    const request = useRef<AbortController | null>(null)

    useEffect(() => () => request.current?.abort(), [])

    async function connect(
        input: Credentials,
        configureNotifications: boolean,
    ) {
        if (request.current) return

        const controller = new AbortController()
        request.current = controller

        setConnectionStage('checking')
        setError(null)

        try {
            const credentials = normalizeCredentials(input)

            await verifyCredentials(credentials, controller.signal)

            if (controller.signal.aborted) return

            if (configureNotifications) {
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

    return { error, connectionStage, isConnecting, connect }
}
