import { useLocalSearchParams, useRouter } from "expo-router";
import { getAuth } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useState } from "react";

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
  const { lobbyName, gameId, status, isPublic, hostId } = useLocalSearchParams();
  const [input, setInput] = useState("");
  const [lobbies, setLobbies] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);


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
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        lobbiesArray.push({
          id: doc.id,
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

    // Add player to the `players` map
    await updateDoc(gameRef, {
      [`players.${user.uid}`]: {
        score: 0,
        name: user.displayName || "Anonymous",
      },
    });

    console.log(`✅ ${user.uid} joined game ${gameIdInput}`);

    // Navigate to lobby page with the joined gameId
    router.push({
      pathname: "/lobby",
      params: { gameId: gameIdInput },
    });

    setInput(""); // clear input
    setModalVisible(false)
  } catch (error) {
    console.error("Error joining game:", error);
    alert("Failed to join the game. Please try again.");
  }
};
  const handleJoin = () => {
    router.push({
      pathname: "/lobby",
      params: {
        lobbyName: lobbyName,
        gameId: gameId,
        currStatus: status,
        public: isPublic,
        hostId: hostId,
        maxPlayers: maxPlayers,
      },
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
            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
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
  wrapper: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
  },
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
    paddingTop:5,
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
    borderWidth: 0,
    borderColor: "#1ED760",
    borderRadius: 12,
    padding: 15,
    marginTop: 30,
    marginBottom: 5,
    width: "100%",
    elevation: 8,
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
