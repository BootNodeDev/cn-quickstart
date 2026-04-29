import { loadConfig } from './config.js'
import { buildApp, type Services } from './http/app.js'
import { buildPool } from './pqs/db.js'
import { CantonTokenProvider } from './canton/auth.js'
import { LedgerApi } from './canton/ledger.js'
import { TokenStandardClient } from './token-standard/client.js'
import { TenantRepository, seedAppProvider } from './tenants/repository.js'
import { initOAuth2Registry } from './auth/oauth2.js'
import { LicensingService } from './domain/licensing/service.js'
import { DemoIdentityRepository } from './signup/repository.js'
import { SignupService } from './signup/service.js'
import { ParticipantAdminClient } from './participant-admin/client.js'

const main = async (): Promise<void> => {
  const cfg = loadConfig()
  const pool = buildPool(cfg)
  const tokens = new CantonTokenProvider(cfg)
  const ledger = new LedgerApi(cfg, tokens)
  const tokenStandard = new TokenStandardClient(cfg)
  const tenants = new TenantRepository()
  seedAppProvider(tenants, cfg)
  const oauth2Registry = await initOAuth2Registry(cfg)
  const identities = new DemoIdentityRepository()
  const participantAdmin = cfg.oauth2 !== undefined ? new ParticipantAdminClient(cfg) : undefined
  const signup = participantAdmin !== undefined ? new SignupService(identities, participantAdmin) : undefined
  const licensing = new LicensingService(cfg, pool, ledger, tokenStandard, tenants)
  const services: Services = { cfg, pool, ledger, tokenStandard, tenants, oauth2Registry, licensing, signup }
  const app = await buildApp(services)
  await app.listen({ port: cfg.port, host: '0.0.0.0' })
  app.log.info({ backend: 'js', port: cfg.port, authMode: cfg.authMode }, 'backend-js listening')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
