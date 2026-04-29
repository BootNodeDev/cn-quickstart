import type { FastifyInstance } from 'fastify'
import type { SignupService } from '../signup/service.js'

interface SignupRequest {
  username?: string
}

export const registerSignup = async (app: FastifyInstance, signup: SignupService): Promise<void> => {
  app.post<{ Body: SignupRequest }>('/signup', async (req, reply) => {
    const username = req.body?.username?.trim()
    if (username === undefined || username === '') {
      reply.code(400); return { message: 'username is required' }
    }

    const result = await signup.signup(username)
    req.session.user = {
      name: result.identity.username,
      tenantId: `demo:${result.identity.username}`,
      partyId: result.identity.partyId,
      userId: result.identity.userId,
      roles: ['ROLE_USER'],
      isAdmin: false
    }

    reply.code(result.created ? 201 : 200)
    return {
      name: result.identity.username,
      party: result.identity.partyId,
      roles: ['ROLE_USER'],
      isAdmin: false,
      walletUrl: ''
    }
  })
}
