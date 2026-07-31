/**
 * Setup global de tests.
 * Carga el archivo .env ANTES de que cualquier módulo del backend
 * sea importado por los test files, evitando que env.ts lance
 * por variables no encontradas.
 */
import { config } from 'dotenv'
import { resolve } from 'path'

config({ path: resolve(__dirname, '../.env') })
