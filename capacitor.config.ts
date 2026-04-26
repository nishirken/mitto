import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mitto.app',
  appName: 'mitto',
  webDir: 'dist',
  android: {
    webContentsDebuggingEnabled: true,
    allowMixedContent: false
  },
  server: {
    cleartext: false,
    androidScheme: 'https'
  }
};

export default config;
