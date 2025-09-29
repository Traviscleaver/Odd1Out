import { useFonts } from 'expo-font';
import { Stack } from "expo-router";

export default function RootLayout() {

  const [fontsLoaded] = useFonts({'Orbitron-Medium': require('../assets/fonts/Orbitron-Medium.ttf'),
  });
  
  if (!fontsLoaded) {
      return null;
  }

  return <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="game" options={{ headerShown: false }} />
      <Stack.Screen name="join" options={{ headerShown: false }} />
      <Stack.Screen name="lobby" options={{ headerShown: false }} />
      <Stack.Screen name="play" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
    </Stack>;


}


