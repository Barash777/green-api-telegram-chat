import { expect, it } from 'vitest'
import { normalizeApiUrl, normalizePhone } from './validation'

it('normalizes readable international numbers without accepting arbitrary text', () => {
    expect(normalizePhone('+1 (234) 567-89-01')).toBe('12345678901')
    for (const phone of [
        'abc1234567',
        '123',
        '1234567890123456',
        '0123456789',
        '++1234567890',
    ])
        expect(() => normalizePhone(phone)).toThrow()
})

it('restricts credential destinations to HTTPS GREEN-API hosts', () => {
    expect(normalizeApiUrl(' https://test.green-api.com/ ')).toBe(
        'https://test.green-api.com',
    )
    for (const url of [
        'http://api.green-api.com',
        'https://green-api.com.example.com',
        'https://evilgreen-api.com',
        'https://user:pass@api.green-api.com',
        'https://api.green-api.com/path',
        'https://api.green-api.com?token=x',
    ])
        expect(() => normalizeApiUrl(url)).toThrow()
})
