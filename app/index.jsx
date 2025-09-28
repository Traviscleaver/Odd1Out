import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { db } from './services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Index() {

  const router = useRouter();
  const [user, setUser] = useState(null); //user state for auth
  const [input, setInput] = useState("");

  // Sign in anonymously
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

    return () => unsubscribe();
  }, []);


  const handleSubmit = () => {
    if (!input.trim()) {
      alert("Please enter a value!");
      return;
    }
    alert(`You submitted: ${input}`);
    setInput(""); // clear input
  };

  return (
    <View style={styles.container}>
      <Text style={styles.head}>ODD ONE OUT</Text>

<TouchableOpacity
  onPress={() => {
    if (!user) {
      alert("Signing in... Please wait.");
      return;
    }

    router.push({
      pathname: "/play",
      params: { uid: user.uid }, // ✅ cleaner param passing
    });
  }}
  style={styles.buttons}
>
  <Text style={styles.buttonText}>Play</Text>
</TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/settings')} style={styles.buttons}>
        <Text style={styles.buttonText}>Settings</Text>
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
