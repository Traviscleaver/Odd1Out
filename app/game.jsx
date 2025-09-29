import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  updateDoc,
  runTransaction,
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
  "Nibbles", "Pumpkin", "Buddy", "Teddy", "Cookie",
  "Geek", "Doofus", "Zozo"
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
          callVote: 0,
          players: {
            [currentUserId]: { name: playerName, isTurn: true },
          },
          turnOrder: [currentUserId],
          voteSession: { active: false },
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

    if (!gameData?.voteSession?.active && myTurn) {
      await advanceTurn();
    }
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
    if (!myTurn || gameData?.voteSession?.active) return;
    if (turnTimerRef.current) clearTimeout(turnTimerRef.current);

    turnTimerRef.current = setTimeout(() => {
      if (myTurn) advanceTurn();
    }, 30000);

    return () => {
      if (turnTimerRef.current) clearTimeout(turnTimerRef.current);
    };
  }, [myTurn, gameData?.voteSession?.active]);

  // Auto-scroll chat
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  /* ----------------- VOTING SYSTEM ----------------- */

  const callForVote = async () => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(gameRef);
      if (!snap.exists()) return;

      const data = snap.data();
      const totalPlayers = Object.keys(data.players).length;
      const newCount = (data.callVote || 0) + 1;

      if (newCount / totalPlayers >= 0.5 && !data.voteSession?.active) {
        await startVote(data.players);
      } else {
        transaction.update(gameRef, { callVote: newCount });
      }
    });
  };

  const startVote = async (players) => {
    const gameRef = doc(db, "games", gameId);
    const initialVotes = {};
    const voted = {};
    Object.keys(players).forEach((pid) => {
      initialVotes[pid] = 0;
      voted[pid] = false;
    });
    initialVotes["skip"] = 0;

    await updateDoc(gameRef, {
      callVote: 0,
      "voteSession": {
        active: true,
        votes: initialVotes,
        voted: voted,
      },
    });
  };

  const castVote = async (targetId) => {
    if (!gameId || !currentUserId) return;
    const gameRef = doc(db, "games", gameId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(gameRef);
      if (!snap.exists()) return;

      const data = snap.data();
      if (!data.voteSession?.active) return;
      if (data.voteSession.voted[currentUserId]) return;

      const votes = data.voteSession.votes;
      const voted = data.voteSession.voted;

      votes[targetId] = (votes[targetId] || 0) + 1;
      voted[currentUserId] = true;

      transaction.update(gameRef, {
        "voteSession.votes": votes,
        "voteSession.voted": voted,
      });
    });
  };

  const endVote = async () => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;

    const { players, voteSession } = snap.data();
    const totalPlayers = Object.keys(players).length;

    let maxId = null, maxVotes = 0;
    for (const [pid, count] of Object.entries(voteSession.votes)) {
      if (count > maxVotes) {
        maxVotes = count;
        maxId = pid;
      }
    }

    const updates = { "voteSession.active": false };

    if (maxId !== "skip" && maxVotes / totalPlayers >= 0.5) {
      updates[`players.${maxId}`] = deleteField();
      updates.turnOrder = Object.keys(players).filter((p) => p !== maxId);
    }

    await updateDoc(gameRef, updates);
  };

  /* ------------------------------------------------- */

  // Leave lobby
  const leaveLobby = async () => {
    if (!gameId || !currentUserId) return;

    const gameRef = doc(db, "games", gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;

    const data = snap.data();
    const { players, turnOrder } = data;

    const updates = { [`players.${currentUserId}`]: deleteField() };

    const newTurnOrder = turnOrder.filter((id) => id !== currentUserId);
    updates.turnOrder = newTurnOrder;

    if (players[currentUserId]?.isTurn && newTurnOrder.length > 0) {
      updates[`players.${newTurnOrder[0]}.isTurn`] = true;
    }

    await updateDoc(gameRef, updates);

    router.push("/play");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={80}
    >
      <Text style={styles.head}>OFF BEAT</Text>
      {playerName && (
        <Text style={styles.playerName}>Your name: {playerName}</Text>
      )}

      <Text style={{ color: "#fff", textAlign: "center", marginBottom: 5 }}>
        {gameData?.voteSession?.active
          ? "Voting phase in progress..."
          : myTurn
          ? "Your turn! Send a message (30s)"
          : "Waiting for others..."}
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
          editable={myTurn || gameData?.voteSession?.active}
        />
        <TouchableOpacity
          style={[
            styles.submitButton,
            { backgroundColor: myTurn ? "#1ED760" : "#555" },
          ]}
          onPress={sendMessage}
          disabled={!newMessage.trim()}
        >
          <Text style={{ color: "#fff", fontWeight: "bold" }}>SEND</Text>
        </TouchableOpacity>
      </View>

      {/* Voting Buttons for Demo */}
      {!gameData?.voteSession?.active && (
        <TouchableOpacity onPress={callForVote}>
          <Text style={{ color: "#1ED760", marginTop: 10, textAlign: "center" }}>
            Call for Vote
          </Text>
        </TouchableOpacity>
      )}

      {gameData?.voteSession?.active && (
        <View>
          {Object.keys(players).map((pid) => (
            <TouchableOpacity key={pid} onPress={() => castVote(pid)}>
              <Text style={{ color: "#FF5555", textAlign: "center", marginTop: 5 }}>
                Vote {players[pid].name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={() => castVote("skip")}>
            <Text style={{ color: "#999", textAlign: "center", marginTop: 5 }}>
              Skip Vote
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={endVote}>
            <Text style={{ color: "#1ED760", textAlign: "center", marginTop: 10 }}>
              End Voting
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity onPress={leaveLobby}>
        <Text style={styles.backButton}>QUIT</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
    padding: 20,
    paddingTop: 65,
  },
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
  otherBubble: {
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#666",
  },
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
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButton: {
    color: "#1ED760",
    marginTop: 10,
    padding: 10,
    paddingBottom: 40,
    fontSize: 20,
    textAlign: "center",
  },
});
