import { isNonEmptyString, isRecord } from './guards.js'
import { jsonOrThrow } from './http.js'

export type TokenClient = { tokenEndpoint: string; clientId: string; clientSecret?: string }

export type TokenResponse = { access_token: string; expires_in?: number }

const isTokenResponse = (body: unknown): body is TokenResponse =>
  isRecord(body) &&
  isNonEmptyString(body.access_token) &&
  (body.expires_in === undefined || typeof body.expires_in === 'number')

export const requestToken = async (
  client: TokenClient,
  grantType: string,
  parameters: Record<string, string>
): Promise<TokenResponse> => {
  const clientAuthentication: Record<string, string> =
    client.clientSecret === undefined
      ? { client_id: client.clientId }
      : { client_id: client.clientId, client_secret: client.clientSecret }

  const response = await fetch(client.tokenEndpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: grantType, ...clientAuthentication, ...parameters })
  })

  const body = await jsonOrThrow(response, 'token endpoint')

  if (!isTokenResponse(body)) {
    throw new Error('token endpoint returned an unexpected response')
  }

  return body
}
