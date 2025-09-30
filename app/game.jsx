import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
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
  const alive = currentUserId && players[currentUserId]?.alive;

  const voteSession = gameData?.voteSession || null;

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
    const snap = await getDoc(gameRef);

      // Update only the nested fields for this player (preserves other nested fields)
      await updateDoc(gameRef, {
        [`players.${currentUserId}.name`]: playerName,
        [`players.${currentUserId}.alive`]: true,
      });
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

  };


  // === Voting System ===

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
        // Start a vote session
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

    // register vote
    votes[targetId] = (votes[targetId] || 0) + 1;
    voted[currentUserId] = true;

    transaction.update(gameRef, {
      "voteSession.votes": votes,
      "voteSession.voted": voted,
    });

    const alivePlayers = Object.values(data.players).filter(p => p.alive);
    const totalAlive = alivePlayers.length;

    // Check if all alive players voted
    const aliveIds = Object.keys(data.players).filter(pid => data.players[pid].alive);
    const allVoted = aliveIds.every(pid => voted[pid]);

    // Check skip majority only among alive players
    const skipVotes = votes["skip"] || 0;
    const skipMajority = skipVotes / totalAlive >= 0.5;

    if (allVoted || skipMajority) {
      // trigger endVote after transaction
      setTimeout(() => endVote(), 0);
    }

  });
};


  const endVote = async () => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;

    const { players, voteSession } = snap.data();
    const totalPlayers = Object.keys(players).length;

    let maxId = null;
    let maxVotes = 0;
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
          {voteSession?.active
            ? "Voting phase!"
            : alive
            ? "Type a message..."
            : "spectating"}
        </Text>

	{/* Call Vote / Voting UI */}
	{players?.[currentUserId]?.alive && ( // ✅ Only show if alive
	  !voteSession?.active ? (
	    <TouchableOpacity
	      style={styles.voteButton}
	      onPress={callForVote}
	    >
	      <Text style={{ color: "#fff" }}>Call for Vote</Text>
	    </TouchableOpacity>
	  ) : (
	    <View style={{ marginBottom: 10 }}>
	      <Text style={{ color: "#fff", marginBottom: 5 }}>Vote for a player:</Text>

	      {Object.keys(players)
		.filter((pid) => players[pid].alive) //only list alive players
		.map((pid) => (
		  <TouchableOpacity
		    key={pid}
		    style={styles.voteButton}
		    onPress={() => castVote(pid)}
		    disabled={voteSession.voted?.[currentUserId]}
		  >
		    <Text style={{ color: "#fff" }}>{players[pid].name}</Text>
		  </TouchableOpacity>
		))}

	      {/* Skip option */}
	      <TouchableOpacity
		style={styles.voteButton}
		onPress={() => castVote("skip")}
		disabled={voteSession.voted?.[currentUserId]}
	      >
		<Text style={{ color: "#fff" }}>Skip</Text>
	      </TouchableOpacity>

	      {/* Host-only force end */}
	      {gameData?.hostId === currentUserId && (
		<TouchableOpacity
		  style={styles.voteButton}
		  onPress={endVote}
		>
		  <Text style={{ color: "red" }}>End Vote (Host only)</Text>
		</TouchableOpacity>
	      )}
	    </View>
	  )
	)}


        {/* Chat */}
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
  voteButton: {
    padding: 10,
    marginVertical: 3,
    backgroundColor: "#333",
    borderRadius: 8,
    alignItems: "center",
  },
});

