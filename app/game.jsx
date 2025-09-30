import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  updateDoc,
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { auth, db } from "./services/firebase";

const FRIENDLY_NAMES = [
  "Sunshine", "Bubbles", "Rocket", "Cherry", "Panda",
  "Daisy", "Smiley", "Peanut", "Coco", "Muffin",
  "Nibbles", "Pumpkin", "Buddy", "Teddy", "Cookie"
];

export default function Game() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { gameId: paramGameId } = params;

  const [gameId, setGameId] = useState(paramGameId || "");
  const [currentUserId, setCurrentUserId] = useState(null);
  const [playerName, setPlayerName] = useState("");
  const [gameData, setGameData] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const flatListRef = useRef(null);

  const players = gameData?.players || {};
  const alive = currentUserId && players[currentUserId]?.alive;
  const voteSession = gameData?.voteSession || null;
  const callVote = gameData?.callVote || 0;

  const alivePlayers = Object.values(players).filter((p) => p.alive);
  const totalAlive = alivePlayers.length;

  // local modal state auto-tracks gameData
  const [voteModalVisible, setVoteModalVisible] = useState(false);

  // Assign random friendly name
  useEffect(() => {
    if (!currentUserId || playerName) return;
    const randomName =
      FRIENDLY_NAMES[Math.floor(Math.random() * FRIENDLY_NAMES.length)];
    setPlayerName(randomName);
  }, [currentUserId]);

  // Auth listener
  useEffect(() => {
    if (currentUserId) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUserId(u.uid);
    });
    return unsub;
  }, [currentUserId]);

  // Subscribe to game updates
  useEffect(() => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    const unsub = onSnapshot(gameRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGameData(data);
        setMessages(data.messages || []);
      }
    });
    return unsub;
  }, [gameId]);

  useEffect(() => {
    if (!gameId || !currentUserId || !playerName) return;

    const addSelf = async () => {
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, {
        [`players.${currentUserId}.name`]: playerName,
        [`players.${currentUserId}.alive`]: true,
      });
    };

    addSelf();
  }, [gameId, currentUserId, playerName]);

  // Auto open/close modal based on vote session
  useEffect(() => {
    if (voteSession?.active) {
      setVoteModalVisible(true);

      const voted = Object.keys(voteSession.voted || {}).filter(
        (pid) => voteSession.voted[pid]
      );
      const aliveIds = Object.keys(players).filter((pid) => players[pid].alive);

      const allVoted = aliveIds.every((pid) => voteSession.voted[pid]);

      if (allVoted) {
        setVoteModalVisible(false);
      }
    } else {
      setVoteModalVisible(false);
    }
  }, [voteSession, players]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;

    const gameRef = doc(db, "games", gameId);

    const newMsg = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: players[currentUserId]?.name || playerName,
      text: newMessage.trim(),
    };

    const updatedMessages = [...messages, newMsg];
    setNewMessage("");

    await updateDoc(gameRef, { messages: updatedMessages });
  };

  // Auto-scroll chat
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Leave lobby
  const leaveLobby = async () => {
    if (!gameId || !currentUserId) return;

    const gameRef = doc(db, "games", gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;

    const updates = { [`players.${currentUserId}`]: deleteField() };
    await updateDoc(gameRef, updates);

    router.push("/play");
  };

  // Call vote handler
  const callForVote = async () => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(gameRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const totalPlayers = Object.keys(data.players || {}).length;
      const newCallVote = (data.callVote || 0) + 1;

      if (newCallVote / totalPlayers > 0.5 && !data.voteSession?.active) {
        // Start vote session
        const initialVotes = {};
        const voted = {};
        Object.keys(data.players).forEach((pid) => {
          initialVotes[pid] = 0;
          voted[pid] = false;
        });
        initialVotes["skip"] = 0;

        transaction.update(gameRef, {
          callVote: 0,
          voteSession: {
            active: true,
            votes: initialVotes,
            voted,
          },
        });
      } else {
        transaction.update(gameRef, { callVote: newCallVote });
      }
    });
  };

  // Cast vote
  const castVote = async (targetId) => {
    if (!gameId || !currentUserId) return;
    const gameRef = doc(db, "games", gameId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(gameRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const session = data.voteSession;
      if (!session?.active) return;
      if (session.voted[currentUserId]) return; // already voted

      const votes = { ...session.votes };
      const voted = { ...session.voted };

      votes[targetId] = (votes[targetId] || 0) + 1;
      voted[currentUserId] = true;

      transaction.update(gameRef, {
        "voteSession.votes": votes,
        "voteSession.voted": voted,
      });
    });
  };

  return (
    <View style={styles.backgroundStyle}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS !== "web" ? "padding" : undefined}
      >
        <Text style={styles.head}>OFF BEAT</Text>
        {playerName && (
          <Text style={styles.playerName}>Your name: {playerName}</Text>
        )}

        {/* Call to Vote Button + Counter */}
        {alive && !voteSession?.active && (
          <View style={styles.voteRow}>
            <TouchableOpacity style={styles.voteButton} onPress={callForVote}>
              <Text style={styles.voteButtonText}>Call to Vote</Text>
            </TouchableOpacity>
            <Text style={styles.voteCounter}>
              {callVote}/{Object.keys(players).length}
            </Text>
          </View>
        )}

        {/* Chat */}
        <View style={styles.chatContainer}>
          {/* 🎵 Floating Album Bubble */}
          <View style={styles.albumBubble}>
            <Image
              source={{ uri: "https://via.placeholder.com/100" }}
              style={styles.albumCover}
            />
            <View style={styles.albumTextContainer}>
              <Text style={styles.albumName}>
                {gameData?.album?.name || "ALBUM NAME"}
              </Text>
              <Text style={styles.albumArtist}>
                {gameData?.album?.artist || "ARTIST"}
              </Text>
            </View>
          </View>

          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isOwn = item.senderId === currentUserId;
              return (
                <View
                  style={{
                    marginBottom: 10,
                    alignItems: isOwn ? "flex-end" : "flex-start",
                  }}
                >
                  <Text style={styles.senderName}>{item.senderName}</Text>
                  <View
                    style={[
                      styles.chatBubble,
                      isOwn ? styles.ownBubble : styles.otherBubble,
                    ]}
                  >
                    <Text style={styles.chatMessage}>{item.text}</Text>
                  </View>
                </View>
              );
            }}
            contentContainerStyle={{ paddingBottom: 10 }}
            style={{ marginTop: 80 }}
          />
        </View>

        {/* Chat Input */}
        <View style={styles.chatInputRow}>
          <TextInput
            style={[
              styles.textInput,
              { borderColor: alive ? "#1ED760" : "#555" },
            ]}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={sendMessage}
            editable={alive}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: alive ? "#1ED760" : "#555" },
            ]}
            onPress={sendMessage}
            disabled={!alive || !newMessage.trim()}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>SEND</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <TouchableOpacity onPress={leaveLobby}>
        <Text style={styles.backButton}>QUIT</Text>
      </TouchableOpacity>

      {/* 🗳️ Vote Modal */}
      <Modal visible={voteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vote to Eliminate</Text>
            {Object.entries(players)
              .filter(([id, p]) => p.alive)
              .map(([id, p]) => (
                <TouchableOpacity
                  key={id}
                  style={styles.modalOption}
                  onPress={() => castVote(id)}
                  disabled={voteSession?.voted?.[currentUserId]}
                >
                  <Text style={styles.modalOptionText}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => castVote("skip")}
              disabled={voteSession?.voted?.[currentUserId]}
            >
              <Text style={styles.modalOptionText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundStyle: { flex: 1, backgroundColor: "#121212" },
  container: { flex: 1, padding: 20, paddingTop: 65 },
  head: {
    fontSize: 50,
    fontFamily: "Orbitron-Medium",
    padding: 20,
    color: "#FFFFFF",
    textAlign: "center",
  },
  playerName: {
    fontSize: 18,
    color: "#1ED760",
    marginBottom: 10,
    textAlign: "center",
  },
  voteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  voteButton: {
    backgroundColor: "#ff4444",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  voteButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  voteCounter: {
    marginLeft: 10,
    color: "#fff",
    fontSize: 16,
  },
  chatContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#717171",
    padding: 10,
    borderRadius: 10,
    justifyContent: "flex-end",
    position: "relative",
  },
  albumBubble: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 220,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#666",
    borderRadius: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#666",
    zIndex: 10,
  },
  albumCover: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
    backgroundColor: "#ccc",
  },
  albumTextContainer: { flex: 1, justifyContent: "center" },
  albumName: { fontSize: 14, fontWeight: "bold", color: "#1ED760" },
  albumArtist: { fontSize: 12, color: "#1ED760" },
  chatBubble: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 25,
    maxWidth: "75%",
  },
  ownBubble: { backgroundColor: "#1e1e1e" },
  otherBubble: { backgroundColor: "#1e1e1e", borderWidth: 1, borderColor: "#666" },
  senderName: { fontSize: 12, color: "#aaa", marginBottom: 2 },
  chatMessage: { fontSize: 18, color: "#fff" },
  chatInputRow: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  textInput: {
    flex: 1,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: "#fff",
    marginRight: 10,
  },
  submitButton: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8 },
  backButton: {
    color: "#1ED760",
    marginTop: 10,
    padding: 10,
    paddingBottom: 40,
    fontSize: 20,
    textAlign: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 10,
    width: "80%",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  modalOption: {
    backgroundColor: "#eee",
    padding: 12,
    borderRadius: 8,
    marginVertical: 5,
  },
  modalOptionText: { fontSize: 16, textAlign: "center" },
});
