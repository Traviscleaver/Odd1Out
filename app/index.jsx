import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";



export default function Index() {


  const router = useRouter();
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    if (!input.trim()) {
      alert("Please enter a value!");
      return;
    }
    alert(`You submitted: ${input}`);
    setInput(""); 
  };

  return (

    
    <View style={styles.container}>
      <Text style={styles.head}>ODD ONE OUT</Text>

      <TouchableOpacity onPress={() => router.push('/play')} style={styles.buttons}>
        <Text style={styles.buttonText}>Play</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/settings')} style={styles.buttons}>
        <Text style={styles.buttonText}>Settings</Text>
      </TouchableOpacity>

    </View>
  );
}

const styles = StyleSheet.create({
  head: {
    fontSize: 60,
    fontWeight: 'bold',
    paddingBottom: 40,
    color: "#FFFFFF",
    textAlign: "center",
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    paddingHorizontal: 20,
  },
  buttons: {
    backgroundColor: '#1ED760',
    paddingVertical: 20,
    paddingHorizontal: 60,
    margin: 10,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  inputContainer: {
    flexDirection: "row",
    marginTop: 30,
    width: "100%",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    height: 50,
    borderColor: "#1ED760",
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 15,
    color: "#fff",
    marginRight: 10,
  },
  submitButton: {
    backgroundColor: "#1ED760",
    paddingHorizontal: 20,
    justifyContent: "center",
    borderRadius: 8,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});
