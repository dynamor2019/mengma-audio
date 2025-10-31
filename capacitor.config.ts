import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mengma.audiocomposer',
  appName: '音频合成工具',
  webDir: 'dist',
  // 确保在 Android WebView 中使用安全来源，解锁 getUserMedia（麦克风）能力
  server: {
    androidScheme: 'https',
    hostname: 'capacitorapp'
  }
};

export default config;
