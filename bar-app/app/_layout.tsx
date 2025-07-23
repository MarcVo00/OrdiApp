import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import {Slot} from 'expo-router';
import { CartProvider } from './context/Cartcontext';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function Layout() {
  return (
    <CartProvider>
      <Slot />
    </CartProvider>
  );
}