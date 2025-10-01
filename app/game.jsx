import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  deleteField,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  updateDoc
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
  View
} from "react-native";
import { auth, db } from "./services/firebase";
import { getRandomTrack } from "./utils/helpers";
import { SafeAreaView } from 'react-native-safe-area-context';

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
  const [modalVisible, setModalVisible] = useState(false);
  const [currentSong, setCurrentSong] = useState(null);

  const flatListRef = useRef(null);
  const players = gameData?.players || {};
  const alive = currentUserId && players[currentUserId]?.alive;
  const voteSession = gameData?.voteSession || null;

  // --- Load shared song from Firestore when gameData updates ---
  useEffect(() => {
    if (gameData?.song) {
      setCurrentSong(gameData.song);
    } else {
      setCurrentSong(null);
    }
  }, [gameData]);

  // Auth
  useEffect(() => {
    if (currentUserId) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUserId(u.uid);
    });
    return unsub;
  }, [currentUserId]);

  // Game data updates
  useEffect(() => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    const unsub = onSnapshot(gameRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setGameData(data);
        setMessages(data.messages || []);
        if (data.voteSession?.active) {
          const aliveIds = Object.keys(data.players).filter((pid) => data.players[pid].alive);
          const allVoted = aliveIds.every(pid => data.voteSession.voted[pid]);
          if (allVoted) {
            endVote();
          }
        }
      }
    });
    return unsub;
  }, [gameId]);

  // Pick one random song
  useEffect(() => {
    if (!gameId || !currentUserId) return;

    const pickSong = async () => {
      const gameRef = doc(db, "games", gameId);

      const snap = await getDoc(gameRef);
      if (snap.exists()) {
        const data = snap.data();
        setPlayerName(data.players[currentUserId].name);
      }


      // Use a transaction to set the song only if it's not already set.
      try {
        await runTransaction(db, async (transaction) => {
          const snap = await transaction.get(gameRef);
          if (!snap.exists()) return;
          const data = snap.data();

          // If song already exists, do nothing
          if (data && data.song) return;

          // Choose players object to pass to getRandomTrack:
          // Prefer database players if present, otherwise fallback to local players
          const playersForPick = (data && data.players) ? data.players : (players || {});

          // Safely attempt to pick a random track
          let song;
          try {
            song = getRandomTrack(playersForPick);
          } catch (err) {
            song = null;
          }

          // Fallback if no song could be selected
          if (!song) {
            song = { name: "No song", artist: "", albumCover: "" };
          }

          transaction.update(gameRef, { song });
        });
      } catch (err) {
        console.warn("Failed to set shared song in transaction:", err);
      }
    };

    pickSong();
  }, [gameId, currentUserId, playerName]);

  // Scroll chat
  useEffect(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages]);

  // Vote modal
  useEffect(() => {
    setModalVisible(!!voteSession?.active && alive);
  }, [voteSession?.active, alive]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !currentUserId) return;
    const gameRef = doc(db, "games", gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;

    const newMsg = {
      id: Date.now().toString(),
      senderId: currentUserId,
      senderName: players[currentUserId]?.name || playerName,
      text: newMessage.trim()
    };

    const updatedMessages = [...messages, newMsg];
    setNewMessage("");
    await updateDoc(gameRef, { messages: updatedMessages });
  };

  const callForVote = async () => {
    // guard: do nothing if spectating or missing data
    if (!gameId || !currentUserId || !alive) return;
    const gameRef = doc(db, "games", gameId);

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(gameRef);
      if (!snap.exists()) return;
      const data = snap.data();
      const aliveIds = Object.keys(data.players || {}).filter(
        (pid) => data.players[pid].alive
      );
      const votedPlayers = data.callVoteList || [];
      const hasVoted = votedPlayers.includes(currentUserId);

      const updatedCallVoteList = hasVoted
        ? votedPlayers.filter((pid) => pid !== currentUserId)
        : [...votedPlayers, currentUserId];

      const newCallVoteCount = updatedCallVoteList.length;

      transaction.update(gameRef, {
        callVoteList: updatedCallVoteList,
        callVote: newCallVoteCount
      });

      if (newCallVoteCount / aliveIds.length > 0.5 && !data.voteSession?.active) {
        const initialVotes = {};
        const voted = {};
        aliveIds.forEach((pid) => {
          initialVotes[pid] = 0;
          voted[pid] = false;
        });
        initialVotes["skip"] = 0;

        transaction.update(gameRef, {
          callVote: 0,
          callVoteList: [],
          voteSession: { active: true, votes: initialVotes, voted }
        });
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
      if (session.voted[currentUserId]) return;

      const votes = { ...session.votes };
      const voted = { ...session.voted };

      votes[targetId] = (votes[targetId] || 0) + 1;
      voted[currentUserId] = true;

      transaction.update(gameRef, {
        "voteSession.votes": votes,
        "voteSession.voted": voted
      });
    });
  };

  const endVote = async () => {
    if (!gameId) return;
    const gameRef = doc(db, "games", gameId);
    const snap = await getDoc(gameRef);
    if (!snap.exists()) return;

    const { players, voteSession } = snap.data();

    let maxId = null;
    let maxVotes = 0;
    let secondMaxVotes = 0;
    for (const [pid, count] of Object.entries(voteSession.votes)) {
      if (count > maxVotes) {
        secondMaxVotes = maxVotes;
        maxVotes = count;
        maxId = pid;
      } else if (count > secondMaxVotes) {
        secondMaxVotes = count;
      }
    }

    const updates = { "voteSession.active": false };


    if (maxId && maxVotes > 0 && maxVotes !== secondMaxVotes) {
      if (maxId !== "skip") {
        updates[`players.${maxId}.alive`] = false;
      }
      updates.turnOrder = Object.keys(players).filter((p) => p !== maxId);
    }

    await updateDoc(gameRef, updates);
  };

  const leaveLobby = async () => {
    if (!gameId || !currentUserId) return;
    const gameRef = doc(db, "games", gameId);
    await updateDoc(gameRef, { [`players.${currentUserId}`]: deleteField() });
    router.push("/play");
  };

  const callVoteCount = gameData?.callVoteList?.length || 0;
  const aliveCount = Object.values(players).filter(p => p.alive).length;
  const currentPlayerVoted = gameData?.callVoteList?.includes(currentUserId);

  const imageUri =
    currentSong?.albumCover ??
    currentSong?.image ??
    "https://via.placeholder.com/50";

  return (
    <SafeAreaView style={styles.backgroundStyle}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS !== "web" ? "padding" : undefined}
      >
        <Text style={styles.head}>OFF BEAT</Text>

        <View style={styles.topRow}>
          <TouchableOpacity
            style={[
              styles.voteButton,
              styles.callVoteButton,
              { backgroundColor: !alive ? "#555" : currentPlayerVoted ? "#1ED760" : "#333" }
            ]}
            onPress={callForVote}
            disabled={!alive} // disabled when spectating
          >
            <Text style={{ margin: 4, color: "#fff", fontWeight: "bold" }}>
              Call for Vote
            </Text>
            <Text style={{ color: "#fff", margin: 4 }}>
              {callVoteCount}/{aliveCount} voted
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.quitButton} onPress={leaveLobby}>
            <Text style={{ color: "#fff", fontWeight: "bold", textAlign: "center" }}>
              QUIT
            </Text>
          </TouchableOpacity>
        </View>

        {/* Modal */}
        <Modal
          animationType="slide"
          transparent
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={{ color: "#1ED760", textAlign: "center", margin: 5, fontWeight: "bold" }}>
                Vote for a player
              </Text>

              {Object.keys(players)
                .filter(pid => players[pid].alive)
                .map(pid => {
                  const votesCount = voteSession?.votes?.[pid] || 0;
                  return (
                    <TouchableOpacity
                      key={pid}
                      style={[styles.voteButton, styles.voteButtonModal]}
                      onPress={() => castVote(pid)}
                      disabled={voteSession?.voted?.[currentUserId]}
                    >
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>
                        {players[pid].name + (currentUserId == pid ? " (You)" : "")}
                      </Text>
                      <Text style={{ color: "#fff", fontWeight: "bold" }}>
                        ({votesCount})
                      </Text>
                    </TouchableOpacity>
                  );
                })}

              <TouchableOpacity
                style={[styles.voteButton, styles.voteButtonModal]}
                onPress={() => castVote("skip")}
                disabled={voteSession?.voted?.[currentUserId]}
              >
                <Text style={{ color: "#fff", fontWeight: "bold" }}>Skip</Text>
                <Text style={{ color: "#fff", fontWeight: "bold" }}>
                  ({voteSession?.votes?.["skip"] || 0})
                </Text>
              </TouchableOpacity>

            </View>
          </View>
        </Modal>

        <View style={styles.chatContainer}>
          {/* Now Playing */}
          {currentSong && (
            <View style={styles.nowPlayingContainer}>
              <Image source={{ uri: imageUri }} style={styles.albumCover} />
              <View style={styles.songInfo}>
                <Text style={styles.songName} numberOfLines={1} ellipsizeMode="tail">
                  {currentSong.name}
                </Text>
                <Text style={styles.artistName} numberOfLines={1} ellipsizeMode="tail">
                  {currentSong.artist}
                </Text>
              </View>
            </View>
          )}

          {/* Chat */}
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const isOwn = item.senderId === currentUserId;
              return (
                <View style={{ marginBottom: 2, alignItems: isOwn ? "flex-end" : "flex-start" }}>
                  <Text style={styles.senderName}>{item.senderName}</Text>
                  <View style={[styles.chatBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
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
            style={[styles.textInput, { borderColor: alive ? "#1ED760" : "#555" }]}
            placeholder={voteSession?.active ? "Voting Phase!" : alive ? "Type a message..." : "Spectating..."}
            placeholderTextColor="#888"
            value={newMessage}
            onChangeText={setNewMessage}
            onSubmitEditing={sendMessage}
            editable={alive}
            maxLength={150}
          />
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: alive ? "#1ED760" : "#555" }]}
            onPress={sendMessage}
            disabled={!alive || !newMessage.trim()}
          >
            <Text style={{ color: "#fff", fontWeight: "bold" }}>SEND</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  backgroundStyle: { flex: 1, backgroundColor: "#121212" },
  container: { flex: 1, paddingHorizontal: 16 },
  head: {
    fontSize: 50,
    fontFamily: "Orbitron-Medium",
    padding: 20,
    paddingTop: 0,
    color: "#FFFFFF",
    textAlign: "center"
  },
  playerName: {
    fontSize: 16,
    color: "#1ED760",
    marginBottom: 1,
    textAlign: "left"
  },
  chatContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#717171",
    padding: 10,
    borderRadius: 10,
    justifyContent: "flex-end"
  },
  chatBubble: {
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 22,
    maxWidth: "75%"
  },
  ownBubble: { backgroundColor: "#1e1e1e" },
  otherBubble: {
    backgroundColor: "#1e1e1e",
    borderWidth: 1,
    borderColor: "#1e1e1e"
  },
  senderName: { fontSize: 10, color: "#aaa", marginBottom: 1 },
  chatMessage: { fontSize: 18, color: "#fff" },
  chatInputRow: { flexDirection: "row", alignItems: "center", marginTop: 10, marginBottom: 10 },
  textInput: {
    flex: 1,
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: "#fff",
    marginRight: 10
  },
  submitButton: { paddingVertical: 16, paddingHorizontal: 20, borderRadius: 8 },
  voteButton: {
    padding: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginVertical: 5,
    backgroundColor: "#333",
    borderRadius: 10
  },
  voteButtonModal: {
    width: 260,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)"
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#121212",
    borderRadius: 50,
    padding: 5,
    paddingBottom: 20,
    paddingHorizontal: 0,
    alignItems: "center"
  },

  // Call Vote + Quit row
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 5,
    gap: 10
  },
  callVoteButton: {
    flex: 0.8,
    paddingVertical: 7,
  },
  quitButton: {
    flex: 0.2,
    backgroundColor: "red",
    paddingVertical: 10,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center"
  },

  // Now Playing
  nowPlayingContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#333",
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
    width: "100%"
  },
  albumCover: { width: 35, height: 35, borderRadius: 5 },
  songInfo: {
    marginLeft: 10,
    flex: 1
  },
  songName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    flexShrink: 1,
    flexWrap: "wrap"
  },
  artistName: {
    color: "#fff",
    fontSize: 14,
    flexShrink: 1,
    flexWrap: "wrap"
  }
});
