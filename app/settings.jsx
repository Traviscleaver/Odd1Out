import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { promptSpotifyLogin } from "../services/spotify";

export default function Index() {
   const handleJoin = (player) => {
    promptSpotifyLogin();
    };

  return (
    <View style={styles.container}>
      <Text style={styles.head}>SETTINGS</Text>
      <TouchableOpacity style={styles.submitButton} onPress={handleJoin}>
          <Text style={styles.submitButtonText}>LINK SPOTIFY</Text>
      </TouchableOpacity>
    </View>
  );
}


const styles = StyleSheet.create({
  head: {
    fontSize: 50,
    color: "#FFFFFF"
  },
  container: {
    flex: 1,justifyContent: "center",alignItems: "center", backgroundColor: "#121212"
  },
  submitButton: {
    marginTop:20,
    padding:20,
    backgroundColor: "#1ED760",
    paddingHorizontal: 60,
    justifyContent: "center",
    borderRadius: 7,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

