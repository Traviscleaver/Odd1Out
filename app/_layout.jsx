import { useFonts } from 'expo-font';
import { Stack } from "expo-router";
import { View } from 'react-native';

export default function RootLayout() {

  const [fontsLoaded] = useFonts({
    'Orbitron-Medium': require('../assets/fonts/Orbitron-Medium.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return <View style={{ flex: 1, backgroundColor: '#121212' }}>
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: '#121212' }
      }} />
  </View>;
}
