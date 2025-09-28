import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { db } from "./services/firebase"; // your Firestore config

export default function Join() {
  const router = useRouter();
  const { lobbyName, gameId, status, isPublic, hostId, maxPlayers, userId } =
    useLocalSearchParams();

  const [input, setInput] = useState("");
  const [lobbies, setLobbies] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);

  const [players, setPlayers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(userId || null);
  const [addedToPlayers, setAddedToPlayers] = useState(false);
  const snapshotUnsubRef = useRef(null);

  // 🔹 Get auth user if not passed in params
  useEffect(() => {
    if (currentUserId) return;
    const auth = getAuth();
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUserId(u.uid);
    });
    return unsub;
  }, [currentUserId]);

  // 🔹 Get list of public lobbies
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
        lobbiesArray.push({
          id: docSnap.id,
          lobbyName: data.lobbyName,
          status: data.status,
        });
      });
      setLobbies(lobbiesArray);
    } catch (error) {
      console.error("Error fetching lobbies: ", error);
    }
  };

  useEffect(() => {
    getLobbies();
  }, []);

  // 🔹 Subscribe to players list when in a game
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, "games", gameId);
    const unsub = onSnapshot(
      gameRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setPlayers(Array.isArray(data.players) ? data.players : []);
        }
      },
      (err) => console.error("onSnapshot error:", err)
    );

    snapshotUnsubRef.current = unsub;
    return () => {
      if (snapshotUnsubRef.current) snapshotUnsubRef.current();
      snapshotUnsubRef.current = null;
    };
  }, [gameId]);

  // ✅ Add current user once
  useEffect(() => {
    if (!gameId || !currentUserId || addedToPlayers) return;

    const addSelf = async () => {
      try {
        const gameRef = doc(db, "games", gameId);
        await updateDoc(gameRef, {
          players: arrayUnion(currentUserId),
        });
        setAddedToPlayers(true);
      } catch (e) {
        console.error("Error adding self to players:", e);
      }
    };

    addSelf();
  }, [gameId, currentUserId, addedToPlayers]);

  const handleSubmit = async () => {
    const gameIdInput = input.trim();
    if (!gameIdInput) {
      alert("Please enter a Game ID!");
      return;
    }

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        alert("You must be signed in to join a lobby.");
        return;
      }

      const gameRef = doc(db, "games", gameIdInput);
      const gameSnap = await getDoc(gameRef);

      if (!gameSnap.exists()) {
        alert("Game not found. Check the Game ID and try again.");
        return;
      }

      // ✅ Append player to array (not map)
      await updateDoc(gameRef, {
        players: arrayUnion(user.uid),
      });

      console.log(`✅ ${user.uid} joined game ${gameIdInput}`);

      router.push({
        pathname: "/lobby",
        params: { gameId: gameIdInput },
      });

      setInput("");
      setModalVisible(false);
    } catch (error) {
      console.error("Error joining game:", error);
      alert("Failed to join the game. Please try again.");
    }
  };

  const handleJoin = (lobbyId) => {
    router.push({
      pathname: "/lobby",
      params: { gameId: lobbyId },
    });
  };

  return (
    <View style={styles.wrapper}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
      >
        <Text style={styles.head}>OFF BEAT</Text>

        <View style={styles.lobbiesContainer}>
          <Text style={styles.lobbiesTitle}>Available Lobbies</Text>

          {lobbies.length === 0 ? (
            <Text style={styles.noLobbiesText}>No lobbies found</Text>
          ) : (
            lobbies.map((lobby) => (
              <View key={lobby.id} style={styles.lobbyRow}>
                <Text style={styles.lobbyItem}>
                  {lobby.lobbyName} - {lobby.status.toUpperCase()}
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

        <TouchableOpacity onPress={() => router.push("/play")}>
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
            />
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
            >
              <Text style={styles.submitButtonText}>Confirm</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.backButton}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: "#121212" },
  container: { flex: 1 },
  backButton: {
    color: "#1ED760",
    marginTop: 10,
    padding: 5,
    fontSize: 18,
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
  contentContainer: {
    alignItems: "center",
    padding: 20,
    paddingTop: 40,
    paddingBottom: 120,
  },
  head: {
    fontSize: 50,
    fontWeight: "bold",
    paddingTop: 30,
    color: "#FFFFFF",
    textAlign: "center",
  },
  lobbiesContainer: {
    borderRadius: 12,
    padding: 15,
    marginTop: 30,
    marginBottom: 5,
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
  lobbyItem: { color: "#fff", fontSize: 16, flex: 1 },
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
