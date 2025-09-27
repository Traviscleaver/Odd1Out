import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

export default function Join() {
  const router = useRouter();

  // Timer state
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds

  // Chat states
  const [messages, setMessages] = useState([
    { id: "1", text: "Welcome to the game!" },
    { id: "2", text: "Player1: Ready?" },
  ]);
  const [newMessage, setNewMessage] = useState("");

  // Timer effect
  useEffect(() => {
    if (timeLeft === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Handle sending a new chat message
  const sendMessage = () => {
    if (newMessage.trim() === "") return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: newMessage },
    ]);
    setNewMessage("");
  };

  return (
    <View style={styles.container}>
      {/* Song and Timer Row */}
      <View style={styles.songRow}>
        <Text style={styles.playerTitle}>THE SONG HERE</Text>
        <Text style={styles.timer}>{timeLeft}s</Text>
      </View>

      {/* Chat Box (fills all available space) */}
      <View style={styles.chatBox}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Text style={styles.chatMessage}>{item.text}</Text>
          )}
        />
      </View>

      {/* Input for Chat */}
      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          placeholderTextColor="#888"
          value={newMessage}
          onChangeText={setNewMessage}
        />
        <TouchableOpacity style={styles.submitButton} onPress={sendMessage}>
          <Text style={{ color: "#fff", fontWeight: "bold" }}>Send</Text>
        </TouchableOpacity>
      </View>

      {/* Quit Button */}
      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.quitButton}>
        <Text style={styles.buttonText}>Quit Game</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, // makes whole screen usable
    backgroundColor: "#121212",
    padding: 20,
  },
  songRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  playerTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#fff",
  },
  timer: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1ED760",
  },
  chatBox: {
    flex: 1, // expands to take all remaining space
    borderColor: "#1ED760",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#1e1e1e",
    marginBottom: 15,
  },
  chatMessage: {
    color: "#fff",
    marginBottom: 5,
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
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
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  quitButton: {
    backgroundColor: "#1ED760",
    paddingVertical: 15,
    alignItems: "center",
    borderRadius: 8,
  },
});
