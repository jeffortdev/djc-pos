import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.djc.pos',
  appName: 'djc-pos',
  webDir: 'www',
  server: {
    // For development: points the Android app to your dev server over USB (adb reverse)
    // or your machine's LAN IP. Comment out for production builds.
    // url: 'http://10.0.2.2:8100',
    // cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
