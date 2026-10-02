import { isNonEmptyString } from './guards.js'

const DIGITS_ONLY = /^\d+$/

const MIN_PORT = 1

const MAX_PORT = 65535

export const optional = (env: NodeJS.ProcessEnv, name: string): string | undefined => {
  const value = env[name]

  return isNonEmptyString(value) ? value : undefined
}

export const required = (env: NodeJS.ProcessEnv, name: string): string => {
  const value = optional(env, name)

  if (value === undefined) {
    throw new Error(`Missing env var: ${name}`)
  }

  return value
}

export const requiredPort = (env: NodeJS.ProcessEnv, name: string): number => {
  const value = required(env, name)

  const port = Number(value)

  if (!DIGITS_ONLY.test(value.trim()) || port < MIN_PORT || port > MAX_PORT) {
    throw new Error(`Env var ${name} is not a valid port: "${value}"`)
  }

  return port
}
