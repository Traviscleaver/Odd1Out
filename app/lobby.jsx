import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  updateDoc,
  where
} from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { auth, db } from "./services/firebase";

export default function Join() {
  const router = useRouter();
  const params = useLocalSearchParams(); // useful for debugging
  const { lobbyName: paramLobbyName, gameId: paramGameId, hostId: paramHostId, userId: paramUserId } = params;

  // UI / state
  const [lobbyName, setLobbyName] = useState(paramLobbyName || "");
  const [gameId, setGameId] = useState(paramGameId || "");
  const [players, setPlayers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(paramUserId || null);
  const [addedToPlayers, setAddedToPlayers] = useState(false);
  const snapshotUnsubRef = useRef(null);

  // helper debug log (remove in production)
  // console.log("Join params:", params);

  // If userId not passed in params, listen for auth state (anonymous or otherwise)
  useEffect(() => {
    if (currentUserId) return; // already set from params
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) {
        setCurrentUserId(u.uid);
      }
    });
    return unsub;
  }, [currentUserId]);

  // If we only have lobbyName (not gameId), try to find the game doc by lobbyName & status waiting
  useEffect(() => {
    const findByLobbyName = async () => {
      if (gameId || !lobbyName) return;

      try {
        const gamesRef = collection(db, "games");
        const q = query(gamesRef, where("lobbyName", "==", lobbyName), where("status", "==", "waiting"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          // pick first match
          const docSnap = snap.docs[0];
          setGameId(docSnap.id);
          const data = docSnap.data();
          if (data.lobbyName) setLobbyName(data.lobbyName);
        } else {
          // no matching game found — leave lobbyName as-is or show message
          // console.log("No game found by lobbyName.");
        }
      } catch (e) {
        console.error("Error finding game by lobbyName:", e);
      }
    };

    findByLobbyName();
  }, [lobbyName, gameId]);

  // When we have gameId, subscribe to doc and keep players & lobbyName up-to-date.
  // Also add current user to the players array once.
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, "games", gameId);

    // Subscribe
    const unsub = onSnapshot(
      gameRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // defensive: ensure players is an array
          const playersArray = Array.isArray(data.players) ? data.players : [];
          setPlayers(playersArray);

          // keep lobbyName in sync with server (if it wasn't set earlier)
          if (!lobbyName && data.lobbyName) setLobbyName(data.lobbyName);
        } else {
          setPlayers([]);
        }
      },
      (err) => {
        console.error("onSnapshot error:", err);
      }
    );

    // store unsubscribe so we can call it later (if needed)
    snapshotUnsubRef.current = unsub;

    return () => {
      if (snapshotUnsubRef.current) snapshotUnsubRef.current();
      snapshotUnsubRef.current = null;
    };
    // intentionally depend on gameId only here — players update comes from snapshot
  }, [gameId]);

  // Add current user to game.players once (use separate effect so we don't race with snapshot)
  useEffect(() => {
    if (!gameId || !currentUserId || addedToPlayers) return;

    const addSelf = async () => {
      try {
        const gameRef = doc(db, "games", gameId);

        // add user to players using arrayUnion (idempotent)
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

  // Optional: remove user from players when leaving (cleanup)
  const leaveLobby = async () => {
    try {
      if (gameId && currentUserId) {
        const gameRef = doc(db, "games", gameId);
        await updateDoc(gameRef, {
          players: arrayRemove ? arrayRemove(currentUserId) : undefined,
        });
      }
    } catch (e) {
      // arrayRemove may not be available in some older SDK setups; ignore failure
      console.warn("Error removing user from players on leave:", e);
    } finally {
      router.push("/play");
    }
  };

  const handleStartGame = () => {
    // only host should call start — you can check hostId param if needed
    router.push({
      pathname: "/game",
      params: { gameId, lobbyName },
    });
  };

  // Render
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.head}>OFF BEAT</Text>

      <View style={styles.playersContainer}>
        <View style={styles.lobbyHeader}>
          <Text style={styles.playerTitle}>{lobbyName || "Unnamed Lobby"}</Text>
          <Text style={styles.code}>[{gameId || "no-code"}]</Text>
        </View>

        {players.length === 0 ? (
          <Text style={{ color: "#aaa", textAlign: "center" }}>Waiting for players...</Text>
        ) : (
          players.map((player, index) => {
            const isMe = String(player) === String(currentUserId);
            return (
              <View key={index} style={styles.playerRow}>
                <Text style={styles.playerItem}>
                  {`Player ${index + 1}${isMe ? " (You)" : ""}`}
                </Text>
                {/* If you want to show raw userId for debugging, uncomment: */}
                {/* <Text style={{color:'#999'}}>{player}</Text> */}
              </View>
            );
          })
        )}
      </View>

      {/* Show START GAME only for host (if hostId param available) */}
      {String(paramUserId || currentUserId) === String(paramHostId) && (
        <TouchableOpacity style={styles.submitButton} onPress={handleStartGame}>
          <Text style={styles.buttons}>START GAME</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={leaveLobby}>
        <Text style={styles.backButton}>Leave Lobby</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 0.9,
    backgroundColor: "#121212",
  },
  contentContainer: {
    alignItems: "center",
    padding: 20,
  },
  head: {
    marginTop: 40,
    fontSize: 50,
    fontWeight: "bold",
    padding: 20,
    color: "#FFFFFF",
    textAlign: "center",
  },
  playersContainer: {
    borderWidth: 4,
    borderColor: "#1ED760",
    borderRadius: 12,
    padding: 15,
    marginTop: 30,
    marginBottom: 20,
    width: "100%",
    elevation: 8,
  },
  lobbyHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  playerTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
    marginRight: 10,
    textAlign: "center",
  },
  code: {
    fontSize: 20,
    color: "#fff",
  },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderColor: "#1ED760",
    borderWidth: 2,
    borderRadius: 5,
    padding: 15,
    marginBottom: 10,
  },
  playerItem: {
    color: "#fff",
    fontSize: 16,
    flex: 1,
  },
  submitButton: {
    backgroundColor: "#1ED760",
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 8,
    marginLeft: 30,
    marginRight: 30,
  },
  backButton: {
    color: "#1ED760",
    marginTop: 10,
    padding: 20,
    fontSize: 20,
    textAlign: "center",
  },
});
