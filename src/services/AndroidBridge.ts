import { Capacitor, registerPlugin, PluginListenerHandle } from "@capacitor/core";
import { AndroidPermissionStatus } from "../types/assistant";

interface ZoyaDeviceControlPlugin {
  openApp(options: { app: string; query?: string }): Promise<{ opened: boolean; packageName?: string; message?: string }>;
  openWebsite(options: { url: string }): Promise<{ opened: boolean }>;
  openTelegramCompose(options: { recipient: string; message: string }): Promise<{ opened: boolean }>;
  openAndroidSettings(options?: { screen?: string }): Promise<{ opened: boolean }>;
  startScreenCapture(): Promise<{ active: boolean }>;
  stopScreenCapture(): Promise<{ active: boolean }>;
  startBackgroundService(): Promise<{ active: boolean }>;
  stopBackgroundService(): Promise<{ active: boolean }>;
  performAccessibilityAction(options: {
    action: string;
    target?: string;
    value?: string;
  }): Promise<{ ok: boolean; screenText?: string; message?: string }>;
  getPermissionStatus(): Promise<AndroidPermissionStatus>;
  addListener(
    eventName: "screenFrame",
    listenerFunc: (data: { jpegBase64: string }) => void
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: "screenCaptureStopped",
    listenerFunc: () => void
  ): Promise<PluginListenerHandle>;
}

const NativePlugin = registerPlugin<ZoyaDeviceControlPlugin>("ZoyaDeviceControl");

export const AndroidBridge = {
  isNativeAndroid(): boolean {
    return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
  },

  async openApp(app: string, query?: string) {
    if (!this.isNativeAndroid()) {
      return { opened: false, message: "Running in web mode." };
    }
    return NativePlugin.openApp({ app, query });
  },

  async openWebsite(url: string) {
    if (!this.isNativeAndroid()) {
      return { opened: false };
    }
    return NativePlugin.openWebsite({ url });
  },

  async openTelegramCompose(recipient: string, message: string) {
    if (!this.isNativeAndroid()) {
      return { opened: false };
    }
    return NativePlugin.openTelegramCompose({ recipient, message });
  },

  async openAndroidSettings(screen = "settings") {
    if (!this.isNativeAndroid()) {
      return { opened: false };
    }
    return NativePlugin.openAndroidSettings({ screen });
  },

  async startScreenCapture() {
    if (!this.isNativeAndroid()) {
      return { active: false };
    }
    return NativePlugin.startScreenCapture();
  },

  async stopScreenCapture() {
    if (!this.isNativeAndroid()) {
      return { active: false };
    }
    return NativePlugin.stopScreenCapture();
  },

  async startBackgroundService() {
    if (!this.isNativeAndroid()) {
      return { active: false };
    }
    return NativePlugin.startBackgroundService();
  },

  async stopBackgroundService() {
    if (!this.isNativeAndroid()) {
      return { active: false };
    }
    return NativePlugin.stopBackgroundService();
  },

  async performAccessibilityAction(action: string, target?: string, value?: string) {
    if (!this.isNativeAndroid()) {
      return { ok: false, message: "Accessibility Service is only available inside the Android app." };
    }
    return NativePlugin.performAccessibilityAction({ action, target, value });
  },

  async getPermissionStatus(): Promise<AndroidPermissionStatus> {
    if (!this.isNativeAndroid()) {
      return {
        isNativeAndroid: false,
        microphone: false,
        notifications: typeof Notification !== "undefined" && Notification.permission === "granted",
        accessibilityEnabled: false,
        screenCaptureActive: false,
        backgroundServiceActive: false,
      };
    }
    return NativePlugin.getPermissionStatus();
  },

  addScreenFrameListener(cb: (jpegBase64: string) => void) {
    if (!this.isNativeAndroid()) return null;
    return NativePlugin.addListener("screenFrame", (data) => cb(data.jpegBase64));
  },

  addScreenStopListener(cb: () => void) {
    if (!this.isNativeAndroid()) return null;
    return NativePlugin.addListener("screenCaptureStopped", cb);
  },
};
