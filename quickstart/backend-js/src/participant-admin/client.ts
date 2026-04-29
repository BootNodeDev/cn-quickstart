import type { BackendConfig } from '../config.js'
import { ClientCredentialsTokenProvider, buildTokenUrl } from '../auth/client-credentials.js'

interface PartyDetailsResponse {
  partyDetails?: Array<{ party?: string }>
  participantId?: string
}

interface PartyCreationResponse {
  partyDetails?: { party?: string }
}

interface UserResponse {
  user?: { primaryParty?: string }
}

type Rights = Array<
  { kind: { CanActAs: { value: { party: string } } } } |
  { kind: { CanReadAs: { value: { party: string } } } }
>

export class ParticipantAdminClient {
  private readonly tokenProvider: ClientCredentialsTokenProvider

  constructor(private readonly cfg: BackendConfig) {
    if (cfg.oauth2 === undefined) throw new Error('Participant admin client requires oauth2 config')
    this.tokenProvider = new ClientCredentialsTokenProvider(
      buildTokenUrl(cfg.oauth2.issuerUrl),
      cfg.oauth2.participantAdminClientId,
      cfg.oauth2.participantAdminClientSecret
    )
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const token = await this.tokenProvider.getToken()
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${token}`)
    if (init.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json')
    const res = await fetch(`${this.cfg.ledgerJsonApiBaseUrl}${path}`, { ...init, headers })
    if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`)
    if (res.status === 204) return undefined as T
    return await res.json() as T
  }

  private async requestText(path: string, init: RequestInit = {}): Promise<string> {
    const token = await this.tokenProvider.getToken()
    const headers = new Headers(init.headers)
    headers.set('authorization', `Bearer ${token}`)
    if (init.body !== undefined && !headers.has('content-type')) headers.set('content-type', 'application/json')
    const res = await fetch(`${this.cfg.ledgerJsonApiBaseUrl}${path}`, { ...init, headers })
    if (!res.ok) throw new Error(`${path} ${res.status}: ${await res.text()}`)
    return await res.text()
  }

  async getParticipantNamespace(): Promise<string> {
    const res = await this.request<PartyDetailsResponse>('/v2/parties/participant-id')
    const participantId = res.participantId
    if (participantId === undefined || participantId === '') throw new Error('participant namespace missing')
    return participantId.replace(/^participant::/, '')
  }

  async ensureParty(partyIdHint: string): Promise<string> {
    const namespace = await this.getParticipantNamespace()
    const existing = await this.request<PartyDetailsResponse>(
      `/v2/parties/party?parties=${encodeURIComponent(`${partyIdHint}::${namespace}`)}`
    )
    const maybeParty = existing.partyDetails?.[0]?.party
    if (maybeParty !== undefined && maybeParty !== '') return maybeParty

    const created = await this.request<PartyCreationResponse>('/v2/parties', {
      method: 'POST',
      body: JSON.stringify({
        partyIdHint,
        displayName: partyIdHint,
        identityProviderId: ''
      })
    })
    const party = created.partyDetails?.party
    if (party === undefined || party === '') throw new Error('party creation returned no party id')
    return party
  }

  async getUser(userId: string): Promise<UserResponse> {
    return await this.request<UserResponse>(`/v2/users/${encodeURIComponent(userId)}`)
  }

  async createUser(userId: string, username: string, partyId: string): Promise<void> {
    await this.requestText('/v2/users', {
      method: 'POST',
      body: JSON.stringify({
        user: {
          id: userId,
          isDeactivated: false,
          primaryParty: partyId,
          identityProviderId: '',
          metadata: {
            resourceVersion: '',
            annotations: { username }
          }
        },
        rights: []
      })
    })
  }

  async grantRights(userId: string, partyId: string): Promise<void> {
    const rights: Rights = [
      { kind: { CanActAs: { value: { party: partyId } } } },
      { kind: { CanReadAs: { value: { party: partyId } } } }
    ]
    await this.requestText(`/v2/users/${encodeURIComponent(userId)}/rights`, {
      method: 'POST',
      body: JSON.stringify({
        userId,
        identityProviderId: '',
        rights
      })
    })
  }
}
