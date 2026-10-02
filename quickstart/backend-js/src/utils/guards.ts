export const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value !== ''

export const isUndefinedOrEmpty = (value: string | undefined): value is undefined | '' => value === undefined || value === ''
