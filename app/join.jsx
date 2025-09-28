import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Join() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [lobbies, setLobbies] = useState([]); // change this array to test

  const handleSubmit = () => {
    if (!input.trim()) {
      alert("Please enter a value!");
      return;
    }
    alert(`You submitted: ${input}`);
    setInput(""); 
  };

  const handleJoin = (lobby) => {
    alert(`Joining ${lobby}`);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
    >
      <Text style={styles.head}>ODD 1 OUT</Text>

      <View style={styles.lobbiesContainer}>
        <Text style={styles.lobbiesTitle}>Active Lobbies</Text>

        {lobbies.length === 0 ? (
          <Text style={styles.noLobbiesText}>No lobbies found</Text>
        ) : (
          lobbies.map((lobby, index) => (
            <View key={index} style={styles.lobbyRow}>
              <Text style={styles.lobbyItem}>{lobby}</Text>
              <TouchableOpacity
                style={styles.joinButton}
                onPress={() => handleJoin(lobby)}
              >
                <Text style={styles.joinButtonText}>Join</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <TextInput
        style={styles.textInput}
        placeholder="ENTER CODE"
        placeholderTextColor="#fff"
        value={input}
        onChangeText={setInput}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Join With Code</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/play")}>
        <Text style={{ color: "#1ED760", marginTop: 10 }}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212", 
  },
  contentContainer: {
    alignItems: "center",
    padding: 20, 
  },
  head: {
    fontSize: 50,
    padding: 20,
    color: "#FFFFFF",
    textAlign: "center", 
  },
  lobbiesContainer: {
    borderWidth: 2,
    borderColor: "#1ED760", 
    borderRadius: 12,
    padding: 15,
    marginTop: 30,
    marginBottom: 20,
    width: "100%",
  },
  lobbiesTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  lobbyRow: {
    flexDirection: "row", 
    justifyContent: "space-between",
    alignItems: "center",
    borderColor: "#1ED760",
    borderWidth: 2,
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
  },
  lobbyItem: {
    color: "#fff",
    fontSize: 16,
    flex: 1, 
  },
  joinButton: {
    backgroundColor: "#1ED760",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  joinButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  noLobbiesText: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    paddingVertical: 10,
  },
  textInput: {
    height: 50,
    width: "100%",
    borderColor: "#1ED760",
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: "#fff",
    marginBottom: 15,
    textAlign: "center", 
  },
  submitButton: {
    backgroundColor: "#1ED760",
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
