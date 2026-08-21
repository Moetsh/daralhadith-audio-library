import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.daralhadith.audiolibrary",
  appName: "مكتبة دار الحديث الصوتية",
  webDir: "dist",
  android: {
    allowMixedContent: true,
  },
};

export default config;
