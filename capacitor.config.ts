import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sanad.app',
  appName: 'sanad',
  webDir: 'out',
  server: {
    androidScheme: 'https'
  }
};

export default config;
