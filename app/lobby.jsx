import { useLocalSearchParams, useRouter } from "expo-router";
import { onAuthStateChanged } from "firebase/auth";
import { arrayRemove, collection, deleteDoc, deleteField, doc, getDoc, getDocs, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { auth, db } from "./services/firebase";
import * as spotify from "./services/spotify";
import { Image } from "react-native";

export default function Join() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { lobbyName: paramLobbyName, gameId: paramGameId, hostId: paramHostId, userId: paramUserId, status: lobbyStatus } = params;
  const [lobbyName, setLobbyName] = useState(paramLobbyName || "");
  const [gameId, setGameId] = useState(paramGameId || "");
  const [players, setPlayers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(paramUserId || null);
  const [addedToPlayers, setAddedToPlayers] = useState(false);
  const [status, setStatus] = useState(lobbyStatus || "waiting");
  const snapshotUnsubRef = useRef(null);

  const isHost = String(currentUserId) === String(paramHostId);
  const topTracks = spotify.refreshAndGetToken().then(spotify.getTracks); // promise

  // Get current user ID if not passed
  useEffect(() => {
    if (currentUserId) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (u) setCurrentUserId(u.uid);
    });
    return unsub;
  }, [currentUserId]);

  // Navigate to game when status changes to playing
  useEffect(() => {
    const func = async () => {
      if (status === "playing") {
        const data = { [`players.${currentUserId}.topTracks`]: await topTracks }
        updateDoc(doc(db, "games", gameId), data, { merge: true });
        router.replace({
          pathname: "/game",
          params: { gameId, lobbyName },
        });
      }
    }
    func();
  }, [status]);

  // If gameId not passed, find game by lobbyName
  useEffect(() => {
    const findByLobbyName = async () => {
      if (gameId || !lobbyName) return;

      try {
        const gamesRef = collection(db, "games");
        const q = query(gamesRef, where("lobbyName", "==", lobbyName), where("status", "==", "waiting"));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          setGameId(docSnap.id);
          const data = docSnap.data();
          if (data.lobbyName) setLobbyName(data.lobbyName);
        }
      } catch (e) {
        console.error("Error finding game by lobbyName:", e);
      }
    };
    findByLobbyName();
  }, [lobbyName, gameId]);

  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, "games", gameId);
    const unsub = onSnapshot(
      gameRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // const playersArray = Array.isArray(data.players) ? data.players : [];
          setPlayers(data.players);

          if (!lobbyName && data.lobbyName) setLobbyName(data.lobbyName);
          if (data.status) setStatus(data.status);
        } else {
          setPlayers({});
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

  // Add current user to players array once
  useEffect(() => {
    if (!gameId || !currentUserId || addedToPlayers) return;

    const addSelf = async () => {
      try {
        const gameRef = doc(db, "games", gameId);
        await updateDoc(gameRef, { [`players.${currentUserId}`]: { alive: true } }, { merge: true });
        setAddedToPlayers(true);
        getDoc(gameRef).then(snap => console.log(snap.data()));
      } catch (e) {
        console.error("Error adding self to players:", e);
      }
    };
    addSelf();
  }, [gameId, currentUserId, addedToPlayers]);

  useEffect(() => {
    getDoc(doc(db, "games", gameId)).then(snap => {
      if (snap.exists()) {
        const data = snap.data();
        console.log("data", data.players);
        const player = data.players[currentUserId];
        if (!player) return;
        console.log("player", player);
        if (!player.alive) {
          alert("Kicked", "You were kicked from the lobby.", [{ text: "OK" }]);
          leaveLobby();
        }
      }
    });
  }, [players]);

  // Remove user from players when leaving
  const leaveLobby = async () => {
    try {
      if (gameId && currentUserId) {
        const gameRef = doc(db, "games", gameId);
        if (Object.keys(players).length <= 1) {
          await deleteDoc(gameRef);
        } else {
          await updateDoc(gameRef, {
            [`players.${currentUserId}`]: deleteField()
          }, {
            merge: true
          });
        }
      }
    } catch (e) {
      console.warn("Error removing user from players on leave:", e);
    } finally {
      router.replace("/play");
    }
  };

  // Update status to playing
  const updateStatus = async () => {
    try {
      const gameRef = doc(db, "games", gameId);
      await updateDoc(gameRef, { status: "playing" });
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };


  const handleStartGame = async () => {
    await updateStatus();
    setStatus("playing");
  };


  const canStart = Object.keys(players).length >= 1;

  const handleKickPlayer = async (playerId) => {
    if (gameId && playerId) {
      const gameRef = doc(db, "games", gameId);
      updateDoc(gameRef, { [`players.${playerId}.alive`]: false }, { merge: true });
    }
  };


  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.head}>OFF BEAT</Text>
      <View style={styles.lobbyHeader}>
        <Text style={styles.playerTitle}>{lobbyName || "Unnamed Lobby"}</Text>
        <Text style={styles.code}>[{gameId || "no-code"}]</Text>
      </View>
      <View style={styles.playersContainer}>
        {Object.keys(players).length === 0 ? (
          <Text style={{ color: "#aaa", textAlign: "center" }}>Waiting for players...</Text>
        ) : (
          Object.keys(players).map((player, index) => {
            const isMe = String(player) === String(currentUserId);
            return (
              <View key={index} style={styles.playerRow}>
                <Text style={styles.playerItem}>
                  {`Player ${index + 1}${isMe ? " (You)" : ""} `}
                </Text>
                {isHost && <TouchableOpacity onPress={() => handleKickPlayer(player)}>
                  <Image source={require("../assets/images/remove.png")} style={{ width: 20, height: 20 }} />
                </TouchableOpacity>}
              </View>
            );
          })
        )}
      </View>

      {isHost && (
        <TouchableOpacity
          disabled={!canStart}
          style={[
            styles.submitButton,
            { backgroundColor: canStart ? "#1ED760" : "#6f6f6fff" },
          ]}
          onPress={handleStartGame}
        >
          <Text style={[styles.buttonStart, { color: canStart ? "#fff" : "#fff" }]}>
            {canStart ? "START GAME" : "WAITING FOR PLAYERS"}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={leaveLobby}>
        <Text style={styles.backButton}>LEAVE</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 0.9, backgroundColor: "#121212" },
  contentContainer: { alignItems: "center", padding: 20 },

  head: { marginTop: 40, fontSize: 50, fontFamily: 'Orbitron-Medium', padding: 20, color: "#FFFFFF", textAlign: "center" },
  playersContainer: { borderColor: "#1EF760", borderBottomWidth: 2, padding: 15, marginTop: 5, marginBottom: 20, width: "100%", elevation: 8, paddingLeft: 20, paddingRight: 20 },
  lobbyHeader: { flexDirection: "row", justifyContent: "center", alignItems: "center", marginBottom: 10 },
  playerTitle: { paddingTop: 15, fontSize: 30, fontWeight: "bold", color: "#fff", marginRight: 10, textAlign: "center" },
  code: { paddingTop: 15, fontSize: 20, color: "#fff" },
  playerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderColor: "#1ED760", borderWidth: 2, borderRadius: 5, padding: 15, marginBottom: 10 },
  playerItem: { color: "#fff", fontSize: 16, flex: 1 },
  submitButton: { paddingVertical: 15, paddingHorizontal: 60, borderRadius: 8, marginLeft: 30, marginRight: 30 },
  buttonStart: { fontSize: 18, fontWeight: "bold", textAlign: "center" },
  buttons: { backgroundColor: '#1ED760', textAlign: 'center', fontSize: 22, margin: 2, color: '#fff', borderRadius: 8 },
  kickButton: { backgroundColor: '#d71e1eff', textAlign: 'center', fontSize: 22, margin: 2, color: '#fff', borderRadius: 8 },
  backButton: { color: "#1ED760", marginTop: 10, padding: 20, fontSize: 20, textAlign: "center" },
});
