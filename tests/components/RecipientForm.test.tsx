// @vitest-environment jsdom
import { act } from 'react'
import { expect, it, vi } from 'vitest'

import { RecipientForm } from '../../src/components/RecipientForm/RecipientForm'
import { enterText, setupComponentTest } from '../helpers/component'

const view = setupComponentTest()

it('requires a phone number and passes the entered value to the chat action', async () => {
    const onOpenChat = vi.fn().mockResolvedValue(undefined)

    await view.render(
        <RecipientForm
            onOpenChat={onOpenChat}
            isOpening={false}
            error={null}
        />,
    )

    const form = view.container.querySelector('form')!
    const input = view.container.querySelector('input')!

    await act(async () => form.requestSubmit())

    expect(onOpenChat).not.toHaveBeenCalled()

    await enterText(input, '+1 (234) 567-8901')
    await act(async () => form.requestSubmit())

    expect(onOpenChat).toHaveBeenCalledExactlyOnceWith('+1 (234) 567-8901')
})

it('disables the form while opening and associates an error with the phone input', async () => {
    const onOpenChat = vi.fn().mockResolvedValue(undefined)

    await view.render(
        <RecipientForm onOpenChat={onOpenChat} isOpening error={null} />,
    )

    expect(view.container.querySelector('input')?.disabled).toBe(true)
    expect(view.container.querySelector('button')?.disabled).toBe(true)
    expect(view.container.querySelector('button')?.textContent).toBe(
        'Ищем получателя…',
    )

    await view.render(
        <RecipientForm
            onOpenChat={onOpenChat}
            isOpening={false}
            error="Получатель не найден"
        />,
    )

    const input = view.container.querySelector('input')!
    const error = view.container.querySelector('[role="alert"]')!

    expect(input.disabled).toBe(false)
    expect(view.container.querySelector('button')?.disabled).toBe(false)
    expect(error.textContent).toBe('Получатель не найден')
    expect(input.getAttribute('aria-describedby')).toBe(error.id)
})
