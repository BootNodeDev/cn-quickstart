import { optional, required, requiredPort } from './utils/env.js'

export interface BackendConfig {
  port: number
  // Signs session cookies. When unset, each start generates a random one; an empty value fails at startup.
  sessionSecret?: string
  registryBaseUri: string
  ledgerHost: string
  ledgerPort: number
  ledgerJsonApiBaseUrl: string
  postgres: { host: string; port: number; database: string; user: string; password: string }
  authMode: 'oauth2' | 'shared-secret'
  testMode: boolean
  appProviderParty: string
  appProviderUserId: string
  // Static bearer token used in shared-secret mode (provided by the onboarding volume).
  sharedSecretToken?: string
  oauth2?: {
    backendClientId: string
    backendClientSecret: string
    backendOidcClientId: string
    issuerUrl: string
    appUserBackendOidcClientId: string
    appUserIssuerUrl: string
  }
}

export const loadConfig = (env: NodeJS.ProcessEnv): BackendConfig => {
  const ledgerHost = required(env, 'LEDGER_HOST')
  const ledgerPort = requiredPort(env, 'LEDGER_PORT')
  const activeProfile = required(env, 'SPRING_PROFILES_ACTIVE').toLowerCase()
  const authMode: 'oauth2' | 'shared-secret' = activeProfile.includes('oauth2')
    ? 'oauth2'
    : 'shared-secret'

  return {
    port: requiredPort(env, 'BACKEND_PORT'),
    sessionSecret: env['SESSION_SECRET'],
    registryBaseUri: required(env, 'REGISTRY_BASE_URI'),
    ledgerHost,
    ledgerPort,
    ledgerJsonApiBaseUrl: `http://${ledgerHost}:${ledgerPort}`,
    postgres: {
      host: required(env, 'POSTGRES_HOST'),
      port: requiredPort(env, 'POSTGRES_PORT'),
      database: required(env, 'POSTGRES_DATABASE'),
      user: required(env, 'POSTGRES_USERNAME'),
      password: required(env, 'POSTGRES_PASSWORD')
    },
    authMode,
    testMode: env['TEST_MODE'] === 'on',
    appProviderParty: required(env, 'APP_PROVIDER_PARTY'),
    // OAuth2: the Keycloak `sub` claim is the user's UUID (AUTH_APP_PROVIDER_BACKEND_USER_ID).
    // Shared-secret: the JWT subject is the username (AUTH_APP_PROVIDER_BACKEND_USER_NAME).
    // The JSON Ledger API rejects requests where commands.userId disagrees with the token's userId claim.
    appProviderUserId: authMode === 'shared-secret'
      ? required(env, 'AUTH_APP_PROVIDER_BACKEND_USER_NAME')
      : (optional(env, 'AUTH_APP_PROVIDER_BACKEND_USER_ID') ?? 'AppId'),
    sharedSecretToken: authMode === 'shared-secret' ? optional(env, 'APP_PROVIDER_BACKEND_USER_TOKEN') : undefined,
    oauth2: authMode === 'oauth2' ? {
      backendClientId: required(env, 'AUTH_APP_PROVIDER_BACKEND_CLIENT_ID'),
      backendClientSecret: required(env, 'AUTH_APP_PROVIDER_BACKEND_SECRET'),
      backendOidcClientId: required(env, 'AUTH_APP_PROVIDER_BACKEND_OIDC_CLIENT_ID'),
      issuerUrl: required(env, 'AUTH_APP_PROVIDER_ISSUER_URL'),
      appUserBackendOidcClientId: optional(env, 'AUTH_APP_USER_BACKEND_OIDC_CLIENT_ID') ?? '',
      appUserIssuerUrl: optional(env, 'AUTH_APP_USER_ISSUER_URL') ?? ''
    } : undefined
  }
}
