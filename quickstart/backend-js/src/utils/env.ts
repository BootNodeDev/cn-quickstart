import { isNonEmptyString } from './guards.js'

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
