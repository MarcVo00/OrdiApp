import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Home() {
  const router = useRouter();
  const [tableId, setTableId] = useState('');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bienvenue au Bar</Text>

      <Text style={styles.subtitle}>Je suis un client</Text>
      <TextInput
        placeholder="Numéro de table"
        value={tableId}
        onChangeText={setTableId}
        style={styles.input}
        keyboardType="numeric"
      />
      <Button
        title="Accéder au menu"
        onPress={() => {
          if (tableId) router.push(`/client/${tableId}`);
        }}
      />

      <View style={styles.separator} />

      <Text style={styles.subtitle}>Personnel</Text>
      <Button title="Interface Serveur" onPress={() => router.push('/serveur')} />
      <Button title="Interface Cuisine" onPress={() => router.push('/cuisine')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 32,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderColor: '#ccc',
  },
  separator: {
    marginVertical: 20,
    borderBottomWidth: 1,
    borderColor: '#eee',
  },
});
