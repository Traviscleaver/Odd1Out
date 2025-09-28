import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { Modal, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from "react-native";
import { db } from './services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { auth } from './services/firebase';


export default function Index() {
  const router = useRouter();
  const { uid } = useLocalSearchParams();
  const [modalVisible, setModalVisible] = useState(false);
  const [lobbyName, setLobbyName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [isPublic, setIsPublic] = useState(true);



  console.log(uid)
  const handleCreateLobby = async (uid) => {
    if (!lobbyName.trim()) {
      alert("Enter a lobby name");
      return;
    }
    const gameRef = await addDoc(collection(db, 'games'), {
	    hostId: uid,
    	    status: "waiting",
	    createdAt: new Date()
    });
	  console.log("Game created with ID:", gameRef.id);


    setModalVisible(false);
    //setIsPublic(true);
    router.push('/lobby');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.head}>PLAY</Text>

      <TouchableOpacity onPress={() => router.push('/join')} style={styles.buttons}>
        <Text style={styles.buttonText}>Join Lobby</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setModalVisible(true)} style={styles.buttons}>
        <Text style={styles.buttonText}>Create Lobby</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={{ color: "#1ED760", marginTop: 10 }}>Back</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Create Lobby</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Lobby Name"
              placeholderTextColor="#fff"
              value={lobbyName}
              onChangeText={setLobbyName}
            />

            <Text style={{ color: "#fff", marginBottom: 5 }}>Max Players</Text>
            <View style={styles.playersRow}>
              {[3,4,5,6,8,9].map(num => (
                <TouchableOpacity
                  key={num}
                  style={[styles.playerButton, maxPlayers === num && styles.selectedPlayerButton]}
                  onPress={() => setMaxPlayers(num)}
                >
                  <Text style={styles.playerButtonText}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={{ color: "#fff" }}>Public Lobby</Text>
              <Switch
                value={isPublic}
                onValueChange={setIsPublic}
                thumbColor={isPublic ? "#1ED760" : "#ccc"}
              />
            </View>

            <TouchableOpacity style={styles.submitButton} onPress={handleCreateLobby}>
              <Text style={styles.submitButtonText}>Create</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={{ color: "#1ED760", marginTop: 10 }}>Cancel</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  head: { fontSize: 50, paddingBottom: 90, color: "#FFFFFF" },
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212" },
  buttons: { backgroundColor: '#1ED760', paddingVertical: 20, paddingHorizontal: 60, margin: 10, borderRadius: 8 },
  backButtons: { backgroundColor: '#1ED760', paddingVertical: 20, paddingHorizontal: 60, margin: 30, borderRadius: 8 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.6)" },
  modalContainer: { width: "85%", backgroundColor: "#121212", borderRadius: 12, padding: 20, alignItems: "center" },
  modalTitle: { fontSize: 24, fontWeight: "bold", color: "#fff", marginBottom: 20 },
  modalInput: { width: "100%", height: 50, borderColor: "#1ED760", borderWidth: 2, borderRadius: 8, paddingHorizontal: 15, color: "#fff", marginBottom: 15 },
  playersRow: { flexDirection: "row", justifyContent: "space-between", width: "100%", marginBottom: 15 },
  playerButton: { backgroundColor: "#333", padding: 10, borderRadius: 5, width: 40, alignItems: "center" },
  selectedPlayerButton: { backgroundColor: "#1ED760" },
  playerButtonText: { color: "#fff", fontWeight: "bold" },
  switchRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 20, paddingHorizontal: 10 },
  submitButton: { backgroundColor: "#1ED760", paddingVertical: 15, paddingHorizontal: 60, borderRadius: 8 },
  submitButtonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
});
