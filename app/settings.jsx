import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.head}>SETTINGS</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  head: {
    fontSize: 50,
    color: "#FFFFFF"
  },
  container: {
    flex: 1,justifyContent: "center",alignItems: "center", backgroundColor: "#121212"
  }

});