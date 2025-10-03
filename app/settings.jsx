import { useEffect, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { checkTokenStatus, clearSpotifyToken, promptSpotifyLogin, webGetSpotifyToken } from "./services/spotify";
import { useApp } from "./_layout";

export default function Index() {
  const app = useApp();
  const [spotifyTimeRemaining, setSpotifyTime] = useState(0);

  const handleJoinSpotify = async () => {
    await promptSpotifyLogin();
    setSpotifyTime(checkTokenStatus());
  };

  const handleUnlinkSpotify = async () => {
    await clearSpotifyToken();
    setSpotifyTime(checkTokenStatus());
  }

  useEffect(() => {
    webGetSpotifyToken().then(_ => setSpotifyTime(checkTokenStatus()));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.head}>SETTINGS</Text>
      {spotifyTimeRemaining > 0 ?
        <>
          <TouchableOpacity style={styles.submitButtonComplete} onPress={handleUnlinkSpotify}>
            <Text style={styles.submitButtonText}>SPOTIFY LINKED</Text>
            {/* <Text style={styles.submitButtonText}>UNLINK SPOTIFY</Text> */}
          </TouchableOpacity>
        </> :
        <TouchableOpacity style={styles.submitButton} onPress={handleJoinSpotify}>
          <Text style={styles.submitButtonText}>LINK SPOTIFY</Text>
        </TouchableOpacity>
      }
      <TouchableOpacity onPress={app.back}>
        <Text style={styles.backButton}>BACK</Text>
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

