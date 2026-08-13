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

export const customerRegistrationSchema = z.object({
  email: z.string().trim().email('Correo inválido').max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres').max(128),
  firstName: z.string().trim().min(1, 'El nombre es requerido').max(80),
  lastName: z.string().trim().min(1, 'El apellido es requerido').max(120),
  phone: z.string().trim().max(30).optional(),
  preferredLanguage: z.enum(['es', 'en']).default('es'),
}).strict()
