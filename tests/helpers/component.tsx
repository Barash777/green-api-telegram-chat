import { act, type ReactNode } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, vi } from 'vitest'

export function setupComponentTest() {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
        container = document.createElement('div')
        document.body.append(container)
        root = createRoot(container)
    })

    afterEach(async () => {
        await act(async () => root.unmount())

        container.remove()
        vi.restoreAllMocks()
        vi.unstubAllGlobals()
    })

    return {
        get container() {
            return container
        },
        async render(component: ReactNode) {
            await act(async () => root.render(component))
        },
    }
}

export async function enterText(
    input: HTMLInputElement | HTMLTextAreaElement,
    text: string,
) {
    const prototype =
        input instanceof HTMLTextAreaElement
            ? HTMLTextAreaElement.prototype
            : HTMLInputElement.prototype

    // Use the native setter so React observes a browser-style input change.
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')!.set!

    await act(async () => {
        setter.call(input, text)
        input.dispatchEvent(new Event('input', { bubbles: true }))
    })
}
