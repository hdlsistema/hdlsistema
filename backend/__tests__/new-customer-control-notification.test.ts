import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('alerta de alta de cliente en Centro de Control', () => {
  it('crea sólo una notificación control y enlaza el expediente del cliente', () => {
    const migration = readFileSync(
      resolve(__dirname, '../migrations/057_new_app_customer_control_notification.sql'),
      'utf8',
    )

    expect(migration).toContain("new.source is distinct from 'public_signup'")
    expect(migration).toContain("'control'")
    expect(migration).toContain("'customer_registered'")
    expect(migration).toContain("'/control/clientes?customerId='")
    expect(migration).toContain("data ->> 'idempotencyKey' = notification_key")
    expect(migration).not.toContain('notification_devices')
    expect(migration).not.toContain('email_outbox')
  })
})
