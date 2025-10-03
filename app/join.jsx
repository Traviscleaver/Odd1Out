import { getAuth } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { db } from "./services/firebase"; // your Firestore config
import { useApp } from "./_layout";

export default function Join() {
  const app = useApp();

  const [input, setInput] = useState("");
  const [lobbies, setLobbies] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  // 🔹 Animation for refresh button
  const spinAnim = useRef(new Animated.Value(0)).current;

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const handleRefreshPress = () => {
    getLobbies();

    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 600,
      easing: Easing.linear,
      useNativeDriver: true,
    }).start();
  };

  // 🔹 Get list of public lobbies (hide full)
  const getLobbies = async () => {
    try {
      const gamesRef = collection(db, "games");
      const q = query(
        gamesRef,
        where("status", "==", "waiting"),
        where("isPublic", "==", true)
      );

      const querySnapshot = await getDocs(q);
      const lobbiesArray = [];
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const maxPlayers = data.maxPlayers || 0;

        if (Object.keys(data.players).length < maxPlayers) {
          lobbiesArray.push({
            id: docSnap.id,
            lobbyName: data.lobbyName,
            players: Object.keys(data.players),
            maxPlayers,
            topic: data.topic || "No topic", // ← Added topic
          });
        }
      });
      setLobbies(lobbiesArray);
    } catch (error) {
      console.error("Error fetching lobbies: ", error);
    }
  };

  useEffect(() => {
    getLobbies();
    const interval = setInterval(() => {
      getLobbies();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // 🔹 Manual join with code
  const handleSubmit = async () => {
    const gameIdInput = input.trim();
    if (!gameIdInput) {
      alert("Please enter a Game ID!");
      return;
    }

    try {
      if (!app.user.uid) {
        alert("You must be signed in to join a lobby.");
        return;
      }

      const gameRef = doc(db, "games", gameIdInput);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        alert("Game not found. Check the Game ID and try again.");
        return;
      }

      handleJoin(gameIdInput);

      setInput("");
      setModalVisible(false);
    } catch (error) {
      console.error("Error joining game:", error);
      alert("Failed to join the game. Please try again.");
    }
  };

  const handleJoin = (gameId) => {
    app.user.game_id = gameId;
    app.goTo({
      pathname: "/lobby",
      params: { gameId: gameId },
    });
  };

  return (
    <SafeAreaView style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.head}>OFF BEAT</Text>

        <View style={styles.lobbiesHeader}>
          <Text style={styles.lobbiesTitle}>AVAILABLE LOBBIES</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefreshPress}>
            <Animated.Image
              source={require("../assets/images/refresh.png")}
              style={[styles.refreshIcon, { transform: [{ rotate: spin }] }]}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.lobbiesContainer}>
          {lobbies.length === 0 ? (
            <Text style={styles.noLobbiesText}>NO LOBBIES</Text>
          ) : (
            lobbies.map((lobby) => (
              <View key={lobby.id} style={styles.lobbyRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lobbyName}>{lobby.lobbyName}</Text>
                  <Text style={styles.lobbyTopic}>{lobby.topic}</Text>{/* ← Display topic */}
                </View>
                <Text style={styles.playersCount}>
                  {lobby.players.length}/{lobby.maxPlayers}
                </Text>
                <TouchableOpacity
                  style={styles.joinButton}
                  onPress={() => handleJoin(lobby.id)}
                >
                  <Text style={styles.joinButtonText}>Join</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* FOOTER */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.submitButton}
          onPress={() => setModalVisible(true)}
        >
          <Text style={styles.submitButtonText}>Join With Code</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={app.back}>
          <Text style={styles.backButtonMain}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* MODAL */}
      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enter Lobby Code</Text>
            <TextInput
              style={styles.textInput}
              placeholder="ENTER CODE"
              placeholderTextColor="#aaa"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={handleSubmit}
            />
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
              <Text style={styles.submitButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.backButton}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#121212" },
  container: { flex: 1 },
  contentContainer: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  head: {
    fontSize: 50,
    paddingTop: 20,
    paddingBottom: 40,
    fontFamily: "Orbitron-Medium",
    color: "#FFFFFF",
    textAlign: "center",
  },
  lobbiesHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  lobbiesTitle: {
    fontSize: 25,
    paddingTop: 30,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 10,
    textAlign: "center",
  },
  refreshButton: {
    paddingTop: 35,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  refreshText: {
    fontSize: 20,
    color: "#1ED760",
  },
  lobbiesContainer: {
    borderRadius: 12,
    padding: 15,
    paddingTop: 0,
    marginTop: 10,
    marginBottom: 5,
    width: "100%",
  },
  refreshIcon: {
    width: 24,
    height: 24,
    tintColor: "#1ED760",
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
  lobbyName: { color: "#fff", fontSize: 16, flex: 1 },
  lobbyTopic: { color: "#aaa", fontSize: 14, marginTop: 3 }, // ← New style for topic
  playersCount: { color: "#ccc", fontSize: 14, marginRight: 15 },
  joinButton: {
    backgroundColor: "#1ED760",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 5,
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
    backgroundColor: "#1e1e1e",
  },
  submitButton: {
    backgroundColor: "#1ED760",
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 8,
    alignSelf: "center",
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  backButtonMain: {
    color: "#1ED760",
    marginTop: 10,
    padding: 20,
    paddingTop: 5,
    fontSize: 20,
    textAlign: "center",
  },
  backButton: {
    color: "#1ED760",
    marginTop: 10,
    padding: 5,
    fontSize: 18,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 15,
    backgroundColor: "#121212",
    borderTopWidth: 1,
    borderTopColor: "#333",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#222",
    borderRadius: 12,
    padding: 20,
    width: "100%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 15,
    textAlign: "center",
  },
});
