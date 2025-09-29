import { useRouter } from "expo-router";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db } from "./services/firebase";
import { generateGameCode } from "./utils/helpers";

export default function Index() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [lobbyName, setLobbyName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [isPublic, setIsPublic] = useState(true);
  const gameId = generateGameCode();
  const gameRef = doc(db, "games", gameId);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        setUser(cred.user);
      } else {
        setUser(currentUser);
      }
    });

    return unsubscribe;
  }, []);

  const handleCreateLobby = async () => {
    if (!lobbyName.trim()) {
      alert("Enter a lobby name");
      return;
    }

    if (!user) {
      alert("User not authenticated yet. Try again.");
      return;
    }


    await setDoc(gameRef, {
      hostId: user.uid,
      lobbyName: lobbyName,
      maxPlayers: maxPlayers,
      isPublic: isPublic,
      players: [user.uid],
      status: "waiting",
    });

    const gameSnap = await getDoc(gameRef);
    const gameData = gameSnap.data();

    console.log("Game created with ID:", gameId);
    setModalVisible(false);

    router.push({
      pathname: '/lobby',
      params: {
        lobbyName: gameData.lobbyName,
        gameId: gameId,
        currStatus: gameData.status,
        public: gameData.isPublic,
        hostId: gameData.hostId,
        maxPlayers: maxPlayers,
      },
    });
  };


  return (
    <View style={styles.container}>
      <Text style={styles.head}>PLAY</Text>

      <TouchableOpacity
        onPress={() => router.push("/join")}
        style={styles.buttons}
      >
        <Text style={styles.buttonText}>JOIN LOBBY</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setModalVisible(true)}
        style={styles.buttons}
      >
        <Text style={styles.buttonText}>CREATE LOBBY</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/")}>
        <Text style={styles.backButton}>BACK</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>CREATE LOBBY</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Lobby Name"
              placeholderTextColor="#fff"
              value={lobbyName}
              onChangeText={setLobbyName}
              onSubmitEditing={handleCreateLobby}
            />

            <Text style={{ color: "#fff", marginBottom: 5 }}>MAX PLAYERS</Text>
            <View style={styles.playersRow}>
              {[3, 4, 5, 6, 7, 8].map((num) => (
                <TouchableOpacity
                  key={num}
                  style={[
                    styles.playerButton,
                    maxPlayers === num && styles.selectedPlayerButton,
                  ]}
                  onPress={() => setMaxPlayers(num)}
                >
                  <Text style={styles.playerButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={{ color: "#fff" }}>PUBLIC LOBBY</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                thumbColor={isPublic ? "#1ED760" : "#ccc"}
              />
            </View>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleCreateLobby}
            >
              <Text style={styles.submitButtonText}>CREATE</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.backButton}>CANCEL</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { fontSize: 50, paddingBottom: 90, color: "#FFFFFF", fontFamily: 'Orbitron-Medium', },
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212" }, backButton: { color: "#1ED760", marginTop: 10, padding: 20, paddingBottom: 30, fontSize: 20 },
  buttons: { backgroundColor: "#1ED760", paddingVertical: 20, paddingHorizontal: 60, margin: 10, borderRadius: 8 },
  backButton: { color: "#1ED760", marginTop: 10, padding: 5, fontSize: 20 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  modalContainer: { width: "85%", backgroundColor: "#121212", borderRadius: 12, padding: 20, alignItems: "center" },
  modalTitle: { fontSize: 24, fontFamily: 'Orbitron-Medium', color: "#fff", marginBottom: 20 },
  modalInput: { width: "100%", height: 50, borderColor: "#1ED760", borderWidth: 2, borderRadius: 8, paddingHorizontal: 15, color: "#fff", marginBottom: 15 },
  playersRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 15 },
  playerButton: { backgroundColor: "#333", padding: 10, borderRadius: 5, width: 40, alignItems: "center" },
  selectedPlayerButton: { backgroundColor: "#1ED760" },
  playerButtonText: { color: "#fff", fontWeight: "bold" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 20, paddingHorizontal: 10 },
  submitButton: { backgroundColor: "#1ED760", paddingVertical: 15, paddingHorizontal: 60, borderRadius: 8 },
  submitButtonText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
});
