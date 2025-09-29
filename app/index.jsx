
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { useEffect, useRef, useState } from "react";
import { Animated, Dimensions, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from "./services/firebase";
import { validateAndRefreshToken } from "./services/spotify";


const { width, height } = Dimensions.get("window");

function FallingEmoji({ emoji, delay, size }) {
  const yAnim = useRef(new Animated.Value(-100)).current;
  const xAnim = useRef(new Animated.Value(getRandomX())).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  function getRandomX() {
    return 0.1 * width + Math.random() * 0.8 * width; 
  }

  useEffect(() => {
    const animateEmoji = () => {
      yAnim.setValue(-100);
      xAnim.setValue(getRandomX());

      const fallDuration = 5000 + Math.random() * 4000;


      const swayAnimations = [];
      let totalTime = 0;
      const segments = 2 + Math.floor(Math.random() * 3);  
      for (let i = 0; i < segments; i++) {
        const duration = fallDuration / segments;
        swayAnimations.push(
          Animated.timing(xAnim, {
            toValue: getRandomX(),
            duration,
            useNativeDriver: true,
          })
        );
        totalTime += duration;
      }

      Animated.parallel([
        Animated.timing(yAnim, {
          toValue: height + 100,
          duration: fallDuration,
          delay,
          useNativeDriver: true,
        }),
        Animated.sequence(swayAnimations),
      ]).start(() => {
        setTimeout(animateEmoji, Math.random() * 1500); 
      });
    };

    animateEmoji();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        transform: [{ translateY: yAnim }, { translateX: xAnim }, { rotate: spin }],
      }}
    >
      <Text style={{ fontSize: size }}>{emoji}</Text>
    </Animated.View>
  );
}




export default function Index() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [spotify_linked, setSpotifyLinked] = useState(false);

  useEffect(() => {
    signInAnonymously(auth)
      .then(() => console.log("Signed in anonymously"))
      .catch((error) => console.error("Sign-in error:", error));

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        console.log("User ID:", currentUser.uid);
      }
    });

    validateAndRefreshToken().then(setSpotifyLinked);

    return () => unsubscribe();
  }, []);

  const emojis = ["🎶", "🎧", "🎵",];
  const totalEmojis = 100;

  return (
    <View style={styles.container}>
      <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
        {Array.from({ length: totalEmojis }).map((_, i) => (
          <FallingEmoji
            key={i}
            emoji={emojis[Math.floor(Math.random() * emojis.length)]}
            delay={i * 300}
            size={20 + Math.random() * 25}
          />
        ))}
      </View>

      <Text style={styles.head}>OFF BEAT</Text>

      <TouchableOpacity
        onPress={() => {
          if (!user) {
            alert("Signing in... Please wait.");
            return;
          }

          if (!spotify_linked) {
            alert("Please link your spotify account first.");
            return;
          }

          router.push({ pathname: "/play", params: { uid: auth.currentUser.uid } });
        }}
        style={spotify_linked ? styles.buttons : styles.disabledButton}
      >
        <Text style={styles.buttonText}>PLAY</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/settings")} style={styles.buttons}>
        <Text style={styles.buttonText}>CONFIGURE</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    fontSize: 60,
    fontFamily: "Orbitron-Medium",
    paddingBottom: 200,
    color: "#FFFFFF",
    textAlign: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    paddingHorizontal: 20,
    overflow: "hidden", // keeps emojis inside screen
  },
  buttons: {
    backgroundColor: "#1ED760",
    paddingVertical: 20,
    paddingHorizontal: 60,
    margin: 10,
    borderRadius: 8,
  },
  disabledButton: {
    color: "#ccc",
    backgroundColor: "#888888",
    paddingVertical: 20,
    paddingHorizontal: 60,
    margin: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
