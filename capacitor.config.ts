import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sanad.app',
  appName: 'sanad',
  webDir: 'out',
  server: {
    // Note: 'hostname' is for local development live-reload only.
    // It's not used in the production APK.
    hostname: 'localhost:9002', 
    androidScheme: 'https'
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
    },
  },
  // Ensure the web content is bundled with the app for offline access
  android: {
    appendUserAgent: 'Capacitor-Web-App',
    // Bundled web assets are more performant and work offline
    useBundledWebRuntime: true, 
  },
};

export default config;
