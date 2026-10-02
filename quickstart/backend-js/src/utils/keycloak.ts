type KeycloakEndpoint = 'token' | 'certs'

export const keycloakEndpoint = (issuerUrl: string, endpoint: KeycloakEndpoint): string =>
  `${issuerUrl.replace(/\/$/, '')}/protocol/openid-connect/${endpoint}`
