import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.harper.vx2000cam',
  appName: 'VX-2000 Cam',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
};

export default config;
