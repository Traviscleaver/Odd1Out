import { useFonts } from 'expo-font';
import { Slot, usePathname, useRouter } from "expo-router";
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { createContext, useContext, useEffect, useState } from 'react';
import { BackHandler } from 'react-native';
import { auth } from './services/firebase';
import * as Spotify from './services/spotify';

const AppContext = createContext();

export function useApp() {
  return useContext(AppContext);
}

function AppContextProvider({ children }) {
  const router = useRouter();

  // --- User Context ---
  const [user, setUser] = useState({ uid: null, name: null, game_id: null });

  useEffect(() => {
    signInAnonymously(auth)
      .then(() => console.log("Signed in anonymously"))
      .catch((error) => console.error("Sign-in error:", error));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({ ...user, uid: currentUser.uid });
        console.log("User ID:", currentUser.uid);
      }
    });

    Spotify.validateAndRefreshToken();

    return () => unsubscribe();
  }, []);

  // --- Navigation ---

  const [currentRoute, setCurrentRoute] = useState(usePathname());
  const BackNavTree = {
    '/': '/',
    '/settings': '/',
    '/play': '/',
    '/lobby': '/join',
    '/join': '/play',
    '/game': '/play',
  };

  const goTo = (href, options) => {
    setCurrentRoute(typeof href === "string" ? href : href.pathname);
    router.replace(href, options);
  };

  const back = () => {
    const prev = BackNavTree[currentRoute];
    if (prev) {
      goTo(prev);
    } else {
      console.warn("Tried to go back but no previous route found.");
      console.warn("Probably forgot to add a page to BackNavTree in _layout.jsx");
      goTo('/'); // fallback
    }
  };

  // Hardware Back Button
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      back();
      return true;
    });
    return () => sub.remove();
  }, [currentRoute]); // if i don't listen to currentRoute, the listener always goes back to '/'

  return (
    <AppContext.Provider value={{ goTo, back, user }}>
      {children}
    </AppContext.Provider>
  );
}

export default function RootLayout() {

  const [fontsLoaded] = useFonts({
    'Orbitron-Medium': require('../assets/fonts/Orbitron-Medium.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AppContextProvider>
      <Slot />
    </AppContextProvider>
  );
}
