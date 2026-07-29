import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.beragamsewabali.dashboard',
  appName: 'BSB Dashboard',
  webDir: 'out',
  
  // Use the live URL so the app always shows the latest version
  // Remove this section if you want to bundle the web app into the APK
  server: {
    url: 'https://dashboard.beragamsewabali.com',
    cleartext: false,
  },
  
  android: {
    // Splash screen & status bar
    backgroundColor: '#0f172a',
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: '#0f172a',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0f172a',
    },
  },
};

export default config;
