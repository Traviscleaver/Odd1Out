import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
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
  const turnTimerRef = useRef(null);

  const players = gameData?.players || {};
  const myTurn = currentUserId && players[currentUserId]?.isTurn;


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

  // Add player to game with turn order
  useEffect(() => {
    if (!gameId || !currentUserId || !playerName) return;

    const addSelf = async () => {
      const gameRef = doc(db, "games", gameId);
      const snap = await getDoc(gameRef);

      if (!snap.exists()) {
        // Create new game
        await setDoc(gameRef, {
          hostId: currentUserId,
          status: "waiting",
          messages: [],
          players: {
            [currentUserId]: { name: playerName, isTurn: true },
          },
          turnOrder: [currentUserId],
        });
      } else {
        const data = snap.data();
        const players = data.players || {};
        const turnOrder = data.turnOrder || Object.keys(players);
        const someoneHasTurn = Object.values(players).some((p) => p.isTurn);

        if (!turnOrder.includes(currentUserId)) turnOrder.push(currentUserId);

        await updateDoc(gameRef, {
          [`players.${currentUserId}`]: {
            name: playerName,
            isTurn: !someoneHasTurn,
          },
          turnOrder,
        });
      }
    };

    addSelf();
  }, [gameId, currentUserId, playerName]);

  // Send message
  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId || !myTurn) return;

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

    await advanceTurn();
  };

  // Advance turn in strict linear order
  const advanceTurn = async () => {
    if (!gameData) return;
    const { players, turnOrder } = gameData;
    if (!turnOrder || turnOrder.length === 0) return;

    let currentIndex = turnOrder.findIndex((id) => players[id]?.isTurn);
    if (currentIndex === -1) currentIndex = 0;

    const nextIndex = (currentIndex + 1) % turnOrder.length;

    const updates = {};
    turnOrder.forEach((id, idx) => {
      updates[`players.${id}.isTurn`] = idx === nextIndex;
    });

    const gameRef = doc(db, "games", gameId);
    await updateDoc(gameRef, updates);
  };

  // Turn timer
  useEffect(() => {
    if (!myTurn) return;
    if (turnTimerRef.current) clearTimeout(turnTimerRef.current);

    turnTimerRef.current = setTimeout(() => {
      if (myTurn) advanceTurn();
    }, 30000);

    return () => {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
    };
  }, [myTurn]);

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

    const data = snap.data();
    const { players, turnOrder } = data;

    const updates = { [`players.${currentUserId}`]: deleteField() };

    // Remove player from turnOrder
    const newTurnOrder = turnOrder.filter((id) => id !== currentUserId);
    updates.turnOrder = newTurnOrder;

    // If leaving player had the turn, give it to the next in order
    if (players[currentUserId]?.isTurn && newTurnOrder.length > 0) {
      updates[`players.${newTurnOrder[0]}.isTurn`] = true;
    }

    await updateDoc(gameRef, updates);

    router.push("/play");
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

        <Text style={{ color: "#fff", textAlign: "center", marginBottom: 5 }}>
          {myTurn ? "Your turn! Send a message (30s)" : "Waiting for others..."}
        </Text>

        <View style={styles.chatContainer}>
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
          />
        </View>

        <View style={styles.chatInputRow}>
          <TextInput
            style={[
              styles.textInput,
              { borderColor: myTurn ? "#1ED760" : "#555" },
            ]}
            placeholder="Type a message..."
            placeholderTextColor="#888"
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={sendMessage}
            editable={myTurn}
          />
          <TouchableOpacity
            style={[
              styles.submitButton,
              { backgroundColor: myTurn ? "#1ED760" : "#555" },
            ]}
            onPress={sendMessage}
            disabled={!myTurn || !newMessage.trim()}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>SEND</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
      <TouchableOpacity onPress={leaveLobby}>
        <Text style={styles.backButton}>QUIT</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundStyle: {
    flex: 1,
    backgroundColor: "#121212",
  },
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 65,
  },
  head: {
    fontSize: 50,
    fontFamily: 'Orbitron-Medium',
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
  chatContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#717171",
    padding: 10,
    borderRadius: 10,
    justifyContent: "flex-end",
  },
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
});

