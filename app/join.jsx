import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
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
  const { lobbyName, gameId, status, isPublic, hostId, maxPlayers } = useLocalSearchParams();
  const [input, setInput] = useState("");
  const [lobbies, setLobbies] = useState([]);


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

  const handleSubmit = () => {
    if (!input.trim()) {
      alert("Please enter a value!");
      return;
    }
    alert(`You submitted: ${input}`);
    setInput("");
  };

const handleJoin = () => {
    router.push({
	    pathname: '/lobby',
	    params: {
    		lobbyName: lobbyName,
    		gameId: gameId,
    		currStatus:status,
    		public: isPublic,
    		hostId: hostId,
		maxPlayers: maxPlayers,
	    },
    });
  };



  return (
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

      <TextInput
        style={styles.textInput}
        placeholder="ENTER CODE"
        placeholderTextColor="#fff"
        value={input}
        onChangeText={setInput}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitButtonText}>Join With Code</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push("/play")}>
        <Text style={styles.backButton}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212",
  },
  backButton: {
    color: "#1ED760", 
    marginTop: 10, 
    padding:20,
    paddingBottom:30,
    fontSize: 20
  },
  contentContainer: {
    alignItems: "center",
    padding: 20,
    paddingTop:40
  },
  head: {
    fontSize: 50,
    fontWeight:"bold",
    paddingTop:30,
    color: "#FFFFFF",
    textAlign: "center",
  },
  lobbiesContainer: {
    borderWidth: 0,
    borderColor: "#1ED760",
    borderRadius: 12,
    padding: 15,
    marginTop: 30,
    marginBottom: 20,
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
  },
  submitButton: {
    backgroundColor: "#1ED760",
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
