import { z } from 'zod'

export const initialPasswordSchema = z.object({
  password: z.string()
    .min(12, 'La contraseña debe tener al menos 12 caracteres')
    .max(128, 'La contraseña es demasiado larga')
    .regex(/[a-z]/, 'Incluye una letra minúscula')
    .regex(/[A-Z]/, 'Incluye una letra mayúscula')
    .regex(/[0-9]/, 'Incluye un número')
    .regex(/[^A-Za-z0-9]/, 'Incluye un símbolo'),
})
