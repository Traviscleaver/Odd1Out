import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function Join() {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);

  const [timeLeft, setTimeLeft] = useState(60);

  const [messages, setMessages] = useState([
    { id: "1", text: "Welcome to Odd One Out!" },
    { id: "2", text: "One of you is an imposter and must guess the song! Goodluck!"}

  ]);
  const [newMessage, setNewMessage] = useState("");

  useEffect(() => {
    if (timeLeft === 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const sendMessage = () => {
    if (newMessage.trim() === "") return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now().toString(), text: newMessage },
    ]);
    setNewMessage("");
  };

  const quitGame = () => {
    setModalVisible(false);
    router.push("/");
  };

  return (
    <View style={styles.container}>
      <View style={styles.songRow}>
        <Text style={styles.playerTitle}>THE SONG HERE</Text>
        <Text style={styles.timer}>{timeLeft}s</Text>
      </View>

      <View style={styles.chatBox}>
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.chatBubble}>
              <Text style={styles.chatMessage}>{item.text}</Text>
            </View>
          )}
        />
      </View>

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

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.quitButton}
      >
        <Text style={styles.buttonText}>Quit Game</Text>
      </TouchableOpacity>

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Are you sure?</Text>
            <Text style={styles.modalMessage}>
              Do you really want to quit the game?
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#1ED760" }]}
                onPress={quitGame}
              >
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: "#888" }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
    paddingTop:65,
    paddingBottom:40
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
    flex: 1,
    borderColor: "#1ED760",
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#1e1e1e",
    marginBottom: 15,
  },
  chatBubble: {
    borderWidth: 1,
    borderColor: "#666", // grey border around each message
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
    alignSelf: "flex-start",
    backgroundColor: "#1e1e1e",
  },
  chatMessage: {
    color: "#fff",
    fontSize: 16,
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
  buttonText: {
    fontWeight: "bold",
    color: "#fff",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "#1e1e1e",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  modalMessage: {
    color: "#ccc",
    textAlign: "center",
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  modalButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
