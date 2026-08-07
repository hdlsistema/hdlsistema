import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.haciendadeletras.app',
  appName: 'Hacienda de Letras',
  webDir: 'dist-mobile',
  server: {
    androidScheme: 'https',
  },
}

export default config
