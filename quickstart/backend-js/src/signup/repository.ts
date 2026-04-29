export interface DemoIdentity {
  username: string
  partyId: string
  userId: string
}

export class DemoIdentityRepository {
  private readonly identities = new Map<string, DemoIdentity>()

  get(username: string): DemoIdentity | undefined { return this.identities.get(username) }
  put(identity: DemoIdentity): void {
    if (this.identities.has(identity.username)) throw new Error(`Duplicate username: ${identity.username}`)
    this.identities.set(identity.username, identity)
  }
}
