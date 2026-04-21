import type { AuthResult, AuthenticationPort } from '#core/user_management/domain/authentication'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'

import * as schema from '#core/common/drizzle/index'
import { provisionPersonalWorkspace } from '#core/user_management/application/workspace_provisioning'
import { readDevOperatorBootstrapDefaults } from '#core/user_management/support/dev_operator'
import { eq } from 'drizzle-orm'

export interface DevOperatorBootstrapInput {
  email: string
  fullName?: null | string
  password: string
}

export class DevOperatorBootstrapService {
  constructor(private readonly db: PostgresJsDatabase<typeof schema>) {}

  defaults() {
    return readDevOperatorBootstrapDefaults()
  }

  async bootstrap(
    input: DevOperatorBootstrapInput,
    auth: AuthenticationPort
  ): Promise<AuthResult> {
    const email = input.email.trim().toLowerCase()
    const fullName = input.fullName?.trim() || undefined

    const [existingUser] = await this.db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, email))
      .limit(1)

    const authentication = existingUser
      ? await auth.signIn(email, input.password)
      : await auth.signUp(email, input.password, fullName)

    await this.db
      .insert(schema.devOperatorAccess)
      .values({ userId: authentication.user.id })
      .onConflictDoNothing()

    await provisionPersonalWorkspace(this.db, {
      displayName: fullName ?? authentication.user.name ?? undefined,
      email,
      isAnonymous: false,
      sessionToken: authentication.session.token,
      userId: authentication.user.id,
    })

    return authentication
  }
}