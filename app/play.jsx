import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { useEffect, useState } from "react";
import {
  Animated,
  FlatList,
  Modal,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { auth, db } from "./services/firebase";
import { generateGameCode } from "./utils/helpers";
import { useApp } from "./_layout";

export default function Play() {
  const app = useApp();

  const [user, setUser] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [lobbyName, setLobbyName] = useState("");
  const [lobbyNameError, setLobbyNameError] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(3);
  const [isPublic, setIsPublic] = useState(true);

  // Genres
  const topics = [
    "Spotify",
    "Animals",
    "Pop Singers",
    "Colors",
    "Country",
    "Sports",
    "Movies",
    "Countries",
    "Foods",
    "Everyday Objects",
  ];

  const [selectedTopic, setSelectedTopic] = useState("Spotify");
  const [topicSearch, setTopicSearch] = useState("");
  const [showTopicList, setShowTopicList] = useState(false);

  // Animation for dropdown
  const [dropdownAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    Animated.timing(dropdownAnim, {
      toValue: showTopicList ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [showTopicList]);

  const filteredTopics = topics.filter((g) =>
    g.toLowerCase().includes(topicSearch.toLowerCase())
  );

  const gameId = generateGameCode();
  const gameRef = doc(db, "games", gameId);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        const cred = await signInAnonymously(auth);
        setUser(cred.user);
      } else {
        setUser(currentUser);
      }
    });

    return unsubscribe;
  }, []);

  const handleCreateLobby = async () => {
    if (!lobbyName.trim()) {
      setLobbyNameError("Please enter a lobby name");
      return;
    }

    if (lobbyName.length < 4 || lobbyName.length > 15) {
      setLobbyNameError("Lobby name must be 4–15 characters");
      return;
    }

    if (!user) {
      setLobbyNameError("User not authenticated yet");
      return;
    }

    setLobbyNameError("");

    await setDoc(gameRef, {
      hostId: user.uid,
      lobbyName: lobbyName,
      maxPlayers: maxPlayers,
      isPublic: isPublic,
      topic: selectedTopic,
      players: { [user.uid]: { alive: true } },
      status: "waiting",
    });

    const gameSnap = await getDoc(gameRef);
    const gameData = gameSnap.data();

    console.log("Game created with ID:", gameId);
    setModalVisible(false);

    app.goTo({
      pathname: "/lobby",
      params: {
        lobbyName: gameData.lobbyName,
        gameId: gameId,
        currStatus: gameData.status,
        public: gameData.isPublic,
        hostId: gameData.hostId,
        maxPlayers: maxPlayers,
        topic: gameData.topic,
      },
    });
  };

  // Animated interpolation
  const dropdownHeight = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200],
  });
  const dropdownOpacity = dropdownAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <SafeAreaView style={styles.wrapper}>
      <View style={styles.container}>
        <Text style={{ ...styles.header, paddingBottom: 200 }}>PLAY</Text>

        <TouchableOpacity
          onPress={() => app.goTo("/join")}
          style={styles.buttons}
        >
          <Text style={styles.buttonText}>JOIN LOBBY</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          style={styles.buttons}
        >
          <Text style={styles.buttonText}>CREATE LOBBY</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => app.back()}>
          <Text style={styles.backButton}>BACK</Text>
        </TouchableOpacity>

        {/* CREATE LOBBY MODAL */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>CREATE LOBBY</Text>

              <TextInput
                style={[
                  styles.modalInput,
                  { borderColor: lobbyNameError ? "red" : "#1ED760" },
                ]}
                placeholder="Lobby Name"
                placeholderTextColor="#fff"
                value={lobbyName}
                onChangeText={(text) => {
                  const slicedText = text.slice(0, 15);
                  setLobbyName(slicedText);

                  if (slicedText.length < 4 || slicedText.length > 15) {
                    setLobbyNameError("Lobby name must be 4–15 characters");
                  } else {
                    setLobbyNameError("");
                  }
                }}
                maxLength={15}
                returnKeyType="done"
                blurOnSubmit={true} // dismiss keyboard
                onSubmitEditing={() => { }} // do nothing on Enter
              />

              {!!lobbyNameError && (
                <Text style={styles.errorText}>{lobbyNameError}</Text>
              )}

              {/* MAX PLAYERS */}
              <Text
                style={{
                  color: "#fff",
                  fontWeight: "bold",
                  marginBottom: 5,
                  marginTop: 15,
                }}
              >
                MAX PLAYERS
              </Text>
              <View style={styles.buttonRow}>
                {[3, 4, 5, 6, 7, 8].map((num) => (
                  <TouchableOpacity
                    key={num}
                    onPress={() => setMaxPlayers(num)}
                    style={[
                      styles.playerButton,
                      maxPlayers === num && styles.playerButtonSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.playerButtonText,
                        maxPlayers === num && styles.playerButtonTextSelected,
                      ]}
                    >
                      {num}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* GENRE SELECTOR (Searchable Dropdown) */}
              <Text
                style={{ color: "#fff", marginBottom: 5, fontWeight: "600" }}
              >
                TOPIC
              </Text>
              <TouchableOpacity
                onPress={() => setShowTopicList(!showTopicList)}
                style={styles.topicSelector}
              >
                <Text style={styles.topicText}>{selectedTopic}</Text>
              </TouchableOpacity>

              <Animated.View
                style={[
                  styles.dropdownContainer,
                  {
                    height: dropdownHeight,
                    opacity: dropdownOpacity,
                    overflow: "hidden",
                  },
                ]}
              >
                {showTopicList && (
                  <FlatList
                    data={filteredTopics}
                    keyExtractor={(item) => item}
                    renderItem={({ item }) => (
                      <TouchableOpacity
                        onPress={() => {
                          setSelectedTopic(item);
                          setShowTopicList(false);
                          setTopicSearch("");
                        }}
                        style={styles.dropdownItem}
                      >
                        <Text style={styles.dropdownItemText}>{item}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}
              </Animated.View>

              {/* PUBLIC SWITCH */}
              <View style={styles.switchRow}>
                <Text style={{ color: "#fff", fontWeight: "600" }}>
                  PUBLIC LOBBY
                </Text>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  thumbColor={isPublic ? "#1ED760" : "#ccc"}
                />
              </View>

              {/* SUBMIT */}
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleCreateLobby}
              >
                <Text style={styles.submitButtonText}>CREATE</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.backButtonModal}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    fontSize: 50,
    color: "#FFFFFF",
    fontFamily: "Orbitron-Medium",
    alignSelf: "center",
    paddingTop: 20,
  },
  wrapper: { backgroundColor: "#121212", flex: 1 },
  container: { flex: 1, justifyContent: "center", alignItems: "center" },
  backButton: {
    color: "#1ED760",
    marginTop: 10,
    marginBottom: 50,
    padding: 5,
    fontSize: 20,
  },
  backButtonModal: {
    color: "#1ED760",
    marginTop: 10,
    marginBottom: 10,
    padding: 5,
    fontSize: 20,
  },
  buttons: {
    backgroundColor: "#1ED760",
    paddingVertical: 20,
    paddingHorizontal: 60,
    margin: 10,
    borderRadius: 8,
  },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContainer: {
    width: "85%",
    backgroundColor: "#121212",
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: "Orbitron-Medium",
    color: "#fff",
    marginBottom: 20,
  },
  modalInput: {
    width: "100%",
    height: 50,
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: "#fff",
    marginBottom: 5,
  },
  errorText: { color: "red", alignSelf: "flex-start", marginBottom: 10 },

  // Max Players
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
  },
  playerButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#333",
    alignItems: "center",
  },
  playerButtonSelected: {
    backgroundColor: "#1ED760",
  },
  playerButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  playerButtonTextSelected: {
    color: "#000",
  },

  // Topic dropdown
  topicSelector: {
    width: "100%",
    backgroundColor: "#333",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 15,
    marginBottom: 0,
    alignItems: "center",
  },

  topicText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },

  dropdownContainer: {
    width: "100%",
    maxHeight: 200,
    borderRadius: 8,
    marginBottom: 5,
    padding: 10,
  },
  searchInput: {
    backgroundColor: "#333",
    color: "#fff",
    borderRadius: 6,
    padding: 10,
    marginBottom: 5,
  },
  dropdownItem: {
    alignItems: "center",
    paddingVertical: 15,
    borderWidth: 2,
    margin: 4,
    borderRadius: 10,
    borderColor: "#333",
    backgroundColor: "#333",
    paddingHorizontal: 5,
  },
  dropdownItemText: {
    color: "#fff",
    fontSize: 16,
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  submitButton: {
    backgroundColor: "#1ED760",
    paddingVertical: 15,
    paddingHorizontal: 60,
    borderRadius: 8,
  },
  submitButtonText: { color: "#fff", fontSize: 20, fontWeight: "bold" },
});
