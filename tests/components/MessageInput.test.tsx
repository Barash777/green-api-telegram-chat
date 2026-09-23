// @vitest-environment jsdom
import { act } from 'react'
import { expect, it, vi } from 'vitest'

import { MessageInput } from '../../src/components/MessageInput/MessageInput'
import { enterText, setupComponentTest } from '../helpers/component'

const view = setupComponentTest()

it('rejects empty and whitespace-only submissions', async () => {
    const onSend = vi.fn().mockResolvedValue(true)

    await view.render(<MessageInput onSend={onSend} isSending={false} />)

    const input = view.container.querySelector('textarea')!
    const form = view.container.querySelector('form')!

    for (const text of ['', '  \n  ']) {
        await enterText(input, text)
        await act(async () => form.requestSubmit())

        expect(view.container.querySelector('button')?.disabled).toBe(true)
    }

    expect(onSend).not.toHaveBeenCalled()
})

it.each([true, false])(
    'clears the draft only on success and restores focus (success: %s)',
    async (success) => {
        const onSend = vi.fn().mockResolvedValue(success)

        await view.render(<MessageInput onSend={onSend} isSending={false} />)

        const input = view.container.querySelector('textarea')!

        await enterText(input, 'Привет\nмир')
        await act(async () =>
            view.container.querySelector('form')!.requestSubmit(),
        )

        expect(onSend).toHaveBeenCalledExactlyOnceWith('Привет\nмир')
        expect(input.value).toBe(success ? '' : 'Привет\nмир')
        expect(document.activeElement).toBe(input)
    },
)

it('sends on Enter but preserves Shift+Enter and IME composition', async () => {
    const onSend = vi.fn().mockResolvedValue(true)

    await view.render(<MessageInput onSend={onSend} isSending={false} />)

    const input = view.container.querySelector('textarea')!

    await enterText(input, 'Привет')

    for (const options of [{ shiftKey: true }, { isComposing: true }]) {
        const event = new KeyboardEvent('keydown', {
            key: 'Enter',
            bubbles: true,
            cancelable: true,
            ...options,
        })

        await act(async () => {
            input.dispatchEvent(event)
        })

        expect(event.defaultPrevented).toBe(false)
        expect(onSend).not.toHaveBeenCalled()
    }

    const enter = new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        cancelable: true,
    })

    await act(async () => {
        input.dispatchEvent(enter)
    })

    expect(enter.defaultPrevented).toBe(true)
    expect(onSend).toHaveBeenCalledExactlyOnceWith('Привет')
})

it('blocks duplicate submissions before the sending prop updates and permits retry', async () => {
    let finish: (success: boolean) => void = () => {}
    const onSend = vi.fn(
        () =>
            new Promise<boolean>((resolve) => {
                finish = resolve
            }),
    )

    await view.render(<MessageInput onSend={onSend} isSending={false} />)

    const input = view.container.querySelector('textarea')!
    const form = view.container.querySelector('form')!

    await enterText(input, 'Привет')
    await act(async () => {
        form.requestSubmit()
        form.requestSubmit()
    })

    expect(onSend).toHaveBeenCalledOnce()

    await act(async () => finish(false))
    await act(async () => form.requestSubmit())

    expect(onSend).toHaveBeenCalledTimes(2)

    await act(async () => finish(true))

    expect(input.value).toBe('')
})

it('locks the composer while a send is in progress', async () => {
    const onSend = vi.fn().mockResolvedValue(true)

    await view.render(<MessageInput onSend={onSend} isSending={false} />)

    const input = view.container.querySelector('textarea')!

    await enterText(input, 'Черновик')
    await view.render(<MessageInput onSend={onSend} isSending />)
    await act(async () => view.container.querySelector('form')!.requestSubmit())

    expect(input.readOnly).toBe(true)
    expect(input.value).toBe('Черновик')
    expect(view.container.querySelector('button')?.disabled).toBe(true)
    expect(
        view.container.querySelector('button')?.getAttribute('aria-label'),
    ).toBe('Отправляется')
    expect(onSend).not.toHaveBeenCalled()
})
