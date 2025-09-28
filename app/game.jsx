import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  arrayUnion,
  doc,
  onSnapshot,
  updateDoc
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db } from "./services/firebase";

// Predefined friendly names
const FRIENDLY_NAMES = [
  "Sunshine", "Bubbles", "Rocket", "Cherry", "Panda",
  "Daisy", "Smiley", "Peanut", "Coco", "Muffin",
  "Nibbles", "Pumpkin", "Buddy", "Teddy", "Cookie"
];

export default function Game() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    gameId: paramGameId,
    hostId: paramHostId,
    userId: paramUserId,
    status: lobbyStatus
  } = params;

  const [gameId, setGameId] = useState(paramGameId || "");
  const [currentUserId, setCurrentUserId] = useState(paramUserId || null);
  const [addedToPlayers, setAddedToPlayers] = useState(false);
  const [status, setStatus] = useState(lobbyStatus || "waiting");
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [playerName, setPlayerName] = useState("");
  const snapshotUnsubRef = useRef(null);
  const flatListRef = useRef(null);

  const isHost = String(paramUserId || currentUserId) === String(paramHostId);

  // Assign friendly name when userId is available
  useEffect(() => {
    if (!currentUserId || playerName) return;
    const randomName = FRIENDLY_NAMES[Math.floor(Math.random() * FRIENDLY_NAMES.length)];
    setPlayerName(randomName);
  }, [currentUserId]);

  // Listen for auth if no userId
  useEffect(() => {
    if (currentUserId) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUserId(u.uid);
    });
    return unsub;
  }, [currentUserId]);

  // Subscribe to game updates (messages, status)
  useEffect(() => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    const unsub = onSnapshot(gameRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setStatus(data.status || status);
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    });
    snapshotUnsubRef.current = unsub;
    return () => snapshotUnsubRef.current && snapshotUnsubRef.current();
  }, [gameId]);

  // Add current user to players (once)
  useEffect(() => {
    if (!gameId || !currentUserId || addedToPlayers) return;
    const addSelf = async () => {
      try {
        const gameRef = doc(db, "games", gameId);
        await updateDoc(gameRef, { players: arrayUnion(currentUserId) });
        setAddedToPlayers(true);
      } catch (e) {
        console.error("Error adding self to players:", e);
      }
    };
    addSelf();
  }, [gameId, currentUserId, addedToPlayers]);

  // Start game (host only)
  const handleStartGame = async () => {
    if (!isHost) return;
    try {
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, { status: "playing" });
      setStatus("playing");
    } catch (error) {
      console.error("Failed to start game:", error);
    }
  };

  // Send chat message
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;
    const messageObj = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: playerName,
      text: newMessage
    };
    try {
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, { messages: arrayUnion(messageObj) });
      setNewMessage("");
    } catch (e) {
      console.error("Error sending message:", e);
    }
  };

  // Leave lobby
  const leaveLobby = async () => {
    try {
      if (gameId && currentUserId) {
        const gameRef = doc(db, "games", gameId);
        await updateDoc(gameRef, { players: arrayRemove(currentUserId) });
      }
    } catch (e) {
      console.warn("Error leaving lobby:", e);
    } finally {
      router.push("/play");
    }
  };

  // Auto-scroll chat to bottom when messages update
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.head}>OFF BEAT</Text>

      {/* Player name display */}
      {playerName && (
        <Text style={styles.playerName}>Your name: {playerName}</Text>
      )}

      <View style={styles.chatContainer}>
        {/* Chat messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.chatBubble}>
              <Text style={styles.chatMessage}>
                {item.senderId === currentUserId ? "You" : item.senderName}: {item.text}
              </Text>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 10 }}
        />

        {/* Chat input at bottom */}
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
      </View>

      {/* Start game */}
      {isHost && (
        <TouchableOpacity style={styles.submitButton} onPress={handleStartGame}>
          <Text style={styles.buttons}>START GAME</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={leaveLobby}>
        <Text style={styles.backButton}>Leave Lobby</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
    paddingTop: 65
  },
  head: {
    fontSize: 50,
    fontWeight: "bold",
    padding: 20,
    color: "#FFFFFF",
    textAlign: "center"
  },
  playerName: {
    fontSize: 18,
    color: "#1ED760",
    marginBottom: 10,
    textAlign: "center"
  },
  chatContainer: {
    flex: 1,
    justifyContent: "flex-end"
  },
  chatBubble: {
    borderWidth: 1,
    borderColor: "#666",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 8,
    alignSelf: "flex-start",
    backgroundColor: "#1e1e1e"
  },
  chatMessage: {
    color: "#fff",
    fontSize: 16
  },
  chatInputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderColor: "#1ED760",
    paddingTop: 5,
    marginTop: 5
  },
  textInput: {
    flex: 1,
    height: 50,
    borderColor: "#1ED760",
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: "#fff",
    marginRight: 10
  },
  submitButton: {
    backgroundColor: "#1ED760",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8
  },
  buttons: {
    textAlign: "center",
    fontSize: 22,
    color: "#fff",
    fontWeight: "bold",
    marginTop: 10
  },
  backButton: {
    color: "#1ED760",
    marginTop: 10,
    padding: 10,
    paddingBottom: 40,
    fontSize: 20,
    textAlign: "center"
  }
});
