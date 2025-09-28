import { useRouter } from "expo-router";
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth } from './services/firebase';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Index() {

  const router = useRouter();
  const [user, setUser] = useState(null);
  const [input, setInput] = useState("");
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

    AsyncStorage.getItem("spotify-token").then((token) => {
      if (token) setSpotifyLinked(true);
    });

    return () => unsubscribe();
  }, []);


  const handleSubmit = () => {
    if (!input.trim()) {
      alert("Please enter a value!");
      return;
    }
    alert(`You submitted: ${input}`);
    setInput("");
  };

  return (
    <View style={styles.container}>
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
        <Text style={styles.buttonText}>Play</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/settings')} style={styles.buttons}>
        <Text style={styles.buttonText}>Configure</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    fontSize: 60,
    fontWeight: 'bold',
    paddingBottom: 40,
    color: "#FFFFFF",
    textAlign: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    paddingHorizontal: 20,
  },
  buttons: {
    backgroundColor: '#1ED760',
    paddingVertical: 20,
    paddingHorizontal: 60,
    margin: 10,
    borderRadius: 8,
  },
  disabledButton: {
    color: '#ccc',
    backgroundColor: '#888888',
    paddingVertical: 20,
    paddingHorizontal: 60,
    margin: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: "row",
    marginTop: 30,
    width: "100%",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    height: 50,
    borderColor: "#1ED760",
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: "#fff",
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: "#1ED760",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
