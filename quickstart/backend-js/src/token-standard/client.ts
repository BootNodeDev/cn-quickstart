import type { BackendConfig } from '../config.js'
import { isRecord } from '../utils/guards.js'
import { jsonOrThrow } from '../utils/http.js'

type RegistryInfo = { adminId: string }

const REGISTRY_INFO_PATH = '/registry/metadata/v1/info'

const isRegistryInfo = (body: unknown): body is RegistryInfo => isRecord(body) && typeof body.adminId === 'string'

export class TokenStandardClient {
  constructor(private readonly cfg: BackendConfig) {}

  private async get(path: string): Promise<unknown> {
    const res = await fetch(`${this.cfg.registryBaseUri}${path}`)

    return jsonOrThrow(res, path)
  }

  private async post(path: string, body: unknown): Promise<unknown> {
    const res = await fetch(`${this.cfg.registryBaseUri}${path}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    })

    return jsonOrThrow(res, path)
  }

  async getRegistryAdminId(): Promise<RegistryInfo> {
    const body = await this.get(REGISTRY_INFO_PATH)

    if (!isRegistryInfo(body)) {
      throw new Error(`${REGISTRY_INFO_PATH} returned no adminId`)
    }

    return body
  }

  async getAllocationTransferContext(allocationCid: string): Promise<unknown> {
    return this.post(
      `/registry/allocations/v1/${encodeURIComponent(allocationCid)}/choice-contexts/execute-transfer`,
      {}
    )
  }
}
