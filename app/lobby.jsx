import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Join() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const { lobbyName, gameId, status, isPublic, hostId, maxPlayers, userId } = useLocalSearchParams();
  const [players, setPlayers] = useState([]); 

  const isHost = String(userId) === String(hostId);

  

  const handleJoin = () => {
     router.push({
	    pathname: '/game',
    });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <Text style={styles.head}>OFF BEAT</Text>

      <View style={styles.playersContainer}>
        <Text style={styles.playerTitle}>{lobbyName}</Text>
        <Text style={styles.code}>[{gameId}]</Text>

        {players.map((player, index) => (
          <View key={index} style={styles.playerRow}>
            <Text style={styles.playerItem}>{player}</Text>
          </View>
        ))}
      </View>

      {!isHost && (
        <TouchableOpacity style={styles.submitButton} onPress={handleJoin}>
          <Text style={styles.buttons}>START GAME</Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity onPress={() => router.push('/play')}>
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
  },
  head: {
    marginTop: 40,
    fontSize: 50,
    fontWeight:"bold",
    padding: 20,
    color: "#FFFFFF",
    textAlign: "center", 
  },
  buttons: {
    backgroundColor: '#1ED760',
    textAlign: 'center',
    fontSize: 22,
    margin: 2,
    color: '#fff',
    borderRadius: 8,
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
  playerTitle: {
    fontSize: 30,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
  code: {
    fontSize: 25,
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
    paddingBottom: 10,
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
    marginLeft: 30,
    marginRight: 30,
  },
});
