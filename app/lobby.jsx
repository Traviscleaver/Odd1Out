import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function Join() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const {lobbyName, gameId } = useLocalSearchParams();
  const [players, setPlayers] = useState([ 
  ]); 

  console.log(lobbyName)
  console.log(gameId)
  const handleJoin = (player) => {
      router.push("/game");

  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      
      <Text style={styles.head}>ODD 1 OUT</Text>

      <View namestyle={styles.playersContainer}>
        <Text style={styles.playerTitle} ></Text>
              <Text style={styles.code}>[CODE]</Text>
        

        {players.map((player, index) => (
          <View key={index} style={styles.playerRow}>
            <Text style={styles.playerItem}>{player}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={handleJoin}>
          <Text style={styles.buttons}>START GAME</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/play')}>
        <Text style={{ color: "#1ED760", marginTop: 10, padding:10}}>Leave Lobby</Text>
      </TouchableOpacity>
    </ScrollView>
    

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121212", 
  },
  contentContainer: {
    alignItems: "center",
    padding: 20, 
  },
  head: {
    fontSize: 50,
    padding: 20,
    color: "#FFFFFF",
    textAlign: "center", 
  },
  buttons: {
    backgroundColor: '#1ED760',
    textAlign: 'center',
    fontSize:22,
    margin: 2,
    color: '#fff',
    borderRadius: 8,
  },
  playersContainer: {
    borderWidth: 2,
    borderColor: "#1ED760", 
    borderRadius: 12,
    padding: 15,
    marginTop: 30,
    marginBottom: 20,
    width: "100%",
  },
  playerTitle: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
  },
    code: {
    fontSize: 25,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
    textAlign: "center",
    paddingBottom:10
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
    marginLeft:30,
    marginRight:30
  },

});
