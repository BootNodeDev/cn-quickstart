interface CachedToken {
  token: string
  expiresAt: number
}

export class ClientCredentialsTokenProvider {
  private cached?: CachedToken

  constructor(
    private readonly tokenUrl: string,
    private readonly clientId: string,
    private readonly clientSecret: string
  ) {}

  async getToken(): Promise<string> {
    const now = Date.now()
    if (this.cached !== undefined && this.cached.expiresAt > now + 30_000) return this.cached.token

    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.clientId,
      client_secret: this.clientSecret
    })
    const res = await fetch(this.tokenUrl, { method: 'POST', body, headers: { 'content-type': 'application/x-www-form-urlencoded' } })
    if (!res.ok) throw new Error(`token endpoint ${res.status}: ${await res.text()}`)
    const json = await res.json() as { access_token: string; expires_in: number }
    this.cached = { token: json.access_token, expiresAt: now + json.expires_in * 1000 }
    return json.access_token
  }
}

export const buildTokenUrl = (issuerUrl: string): string => `${issuerUrl.replace(/\/$/, '')}/protocol/openid-connect/token`
