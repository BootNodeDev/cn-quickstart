import type { BackendConfig } from '../config.js'
import { keycloakEndpoint } from '../utils/keycloak.js'
import { requestToken } from '../utils/token-grant.js'

interface CachedToken { token: string; expiresAt: number }

export class CantonTokenProvider {
  private cached?: CachedToken

  constructor(private readonly cfg: BackendConfig) {}

  async getToken(): Promise<string | undefined> {
    if (this.cfg.authMode === 'shared-secret') return this.cfg.sharedSecretToken
    if (this.cfg.authMode !== 'oauth2' || this.cfg.oauth2 === undefined) return undefined
    const now = Date.now()
    if (this.cached !== undefined && this.cached.expiresAt > now + 30_000) return this.cached.token

    const response = await requestToken(
      {
        tokenEndpoint: keycloakEndpoint(this.cfg.oauth2.issuerUrl, 'token'),
        clientId: this.cfg.oauth2.backendClientId,
        clientSecret: this.cfg.oauth2.backendClientSecret
      },
      'client_credentials',
      {}
    )

    if (response.expires_in !== undefined) {
      this.cached = { token: response.access_token, expiresAt: now + response.expires_in * 1000 }
    }

    return response.access_token
  }
}
