// Running inside the iPhone/Android app (Capacitor) rather than a browser.
import { Capacitor } from '@capacitor/core';

export const isNative = (): boolean => Capacitor.isNativePlatform();
export const nativePlatform = (): 'ios' | 'android' | 'web' => Capacitor.getPlatform() as 'ios' | 'android' | 'web';
export const hasPlugin = (name: string): boolean => Capacitor.isPluginAvailable(name);
