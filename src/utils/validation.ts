import type { Credentials } from '../types/greenApi.types'

export function normalizePhone(input: string): string {
    const phone = input
        .trim()
        .replace(/[\s()-]/g, '')
        .replace(/^\+/, '')

    if (!/^[1-9]\d{6,14}$/.test(phone)) {
        throw new Error('Введите номер с кодом страны: от 7 до 15 цифр.')
    }

    return phone
}

export function normalizeApiUrl(input: string): string {
    let url: URL

    try {
        url = new URL(input.trim())
    } catch {
        throw new Error(
            'Скопируйте полный apiUrl из личного кабинета GREEN-API.',
        )
    }

    if (
        url.protocol !== 'https:' ||
        !(
            url.hostname === 'green-api.com' ||
            url.hostname.endsWith('.green-api.com')
        ) ||
        url.username ||
        url.password ||
        url.port ||
        url.search ||
        url.hash ||
        url.pathname !== '/'
    ) {
        throw new Error(
            'apiUrl должен быть HTTPS-адресом сервера green-api.com без пути и параметров.',
        )
    }

    return url.origin
}

export function normalizeCredentials(input: Credentials): Credentials {
    const credentials = {
        apiUrl: normalizeApiUrl(input.apiUrl),
        idInstance: input.idInstance.trim(),
        apiTokenInstance: input.apiTokenInstance.trim(),
    }

    if (
        !/^\d+$/.test(credentials.idInstance) ||
        !credentials.apiTokenInstance ||
        /\s/.test(credentials.apiTokenInstance)
    ) {
        throw new Error(
            'Проверьте idInstance и apiTokenInstance: пробелы не допускаются.',
        )
    }

    return credentials
}
