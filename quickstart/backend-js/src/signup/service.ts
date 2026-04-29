import type { ParticipantAdminClient } from '../participant-admin/client.js'
import type { DemoIdentity, DemoIdentityRepository } from './repository.js'

export interface SignupResult {
  identity: DemoIdentity
  created: boolean
}

const normalizeUsername = (username: string): string => username.trim().toLowerCase()

const slugify = (username: string): string =>
  username
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

const makeSlug = (username: string): string => slugify(normalizeUsername(username)) || 'user'

const makePartyHint = (username: string): string => `demo-${makeSlug(username)}`

const makeUserId = (username: string): string => `demo-${makeSlug(username)}`

export class SignupService {
  constructor(
    private readonly identities: DemoIdentityRepository,
    private readonly participantAdmin: ParticipantAdminClient
  ) {}

  async signup(rawUsername: string): Promise<SignupResult> {
    const username = normalizeUsername(rawUsername)
    const existing = this.identities.get(username)
    if (existing !== undefined) return { identity: existing, created: false }

    const userId = makeUserId(username)
    try {
      const user = await this.participantAdmin.getUser(userId)
      const partyId = user.user?.primaryParty
      if (partyId === undefined || partyId === '') throw new Error(`Existing user ${userId} has no primary party`)
      const identity: DemoIdentity = { username, partyId, userId }
      this.identities.put(identity)
      return { identity, created: false }
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      if (!message.includes(' 404: ')) throw err

      const partyId = await this.participantAdmin.ensureParty(makePartyHint(username))
      await this.participantAdmin.createUser(userId, username, partyId)
      await this.participantAdmin.grantRights(userId, partyId)

      const identity: DemoIdentity = { username, partyId, userId }
      this.identities.put(identity)
      return { identity, created: true }
    }
  }
}
