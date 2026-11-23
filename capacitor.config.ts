const serverUrl =
  process.env.CAPACITOR_SERVER_URL ||
  "https://ais-pre-osmvxgk3kqe76rkeoztozv-262582699932.asia-northeast1.run.app";

const config = {
  appId: "com.zoya.ai",
  appName: "ZOYA AI",
  webDir: "dist",
  server: {
    url: serverUrl,
    androidScheme: "https",
    cleartext: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#05040A",
      showSpinner: false,
    },
  },
};

export default config;
