import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { promptSpotifyLogin } from "./services/spotify";

export default function Index() {
  const router = useRouter();

  const handleJoinApple = (player) => {
    alert("Not Complete!")
  }

  const handleUnlinkApple = (player) => {
    alert("Not Complete!")
  }

  const handleJoinSpotify = (player) => {
    promptSpotifyLogin();
  };

  const handleUnlinkSpotify = async (player) => {
    AsyncStorage.removeItem("spotify-token");
  }

  const [spotifyToken, setSpotifyToken] = useState(null);
  useEffect(() => {
    const checkSpotifyToken = async () => {
      const spotify_token = await AsyncStorage.getItem("spotify-token");
      if (spotify_token != null) {
        console.log("spotify token found");
        setSpotifyToken(spotify_token);
      }
    };

    checkSpotifyToken();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.head}>SETTINGS</Text>
      {spotifyToken !== null ?
        <>
          <Text style={styles.submitButtonComplete}>SPOTIFY LINKED</Text>
          <TouchableOpacity style={styles.submitButton} onPress={handleUnlinkSpotify}>
            <Text style={styles.submitButtonText}>UNLINK SPOTIFY</Text>
          </TouchableOpacity>
        </> :
        <TouchableOpacity style={styles.submitButton} onPress={handleJoinSpotify}>
          <Text style={styles.submitButtonText}>LINK SPOTIFY</Text>
        </TouchableOpacity>
      }
      {spotifyToken == null ?
        <>
          <Text style={styles.submitButtonComplete}>APPLE LINKED</Text>
          <TouchableOpacity style={styles.submitButton} onPress={handleUnlinkApple}>
            <Text style={styles.submitButtonText}>UNLINK APPLE</Text>
          </TouchableOpacity>
        </> :
        <TouchableOpacity style={styles.submitButton} onPress={handleJoinApple}>
          <Text style={styles.submitButtonText}>LINK APPLE</Text>
        </TouchableOpacity>
      }
      <TouchableOpacity onPress={() => router.push("/")}>
        <Text style={styles.backButton}>Back</Text>
      </TouchableOpacity>
    </View >
  );
}


const styles = StyleSheet.create({
  head: {
    fontSize: 50,
    paddingBottom: 200,
    fontWeight: "bold",
    color: "#FFFFFF"
  },
  container: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212"
  },
  submitButton: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#d71e1eff",
    paddingHorizontal: 60,
    justifyContent: "center",
    borderRadius: 30,
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  submitButtonComplete: {
    marginTop: 20,
    padding: 20,
    backgroundColor: "#1ED760",
    paddingHorizontal: 60,
    justifyContent: "center",
    borderRadius: 30,
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold"
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  spotifyToken: {
    color: "#1ED760",
    fontSize: 20,
    fontWeight: "bold",
  },
  backButton: {
    color: "#1ED760",
    marginTop: 10,
    padding: 20,
    paddingBottom: 100,
    fontSize: 20
  },
});

