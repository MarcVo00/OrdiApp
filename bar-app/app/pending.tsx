// app/pending.tsx
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function Pending() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Compte en attente</Text>
      <Text style={styles.text}>Votre compte a bien été créé. Un administrateur doit le valider avant votre première connexion.</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/login')}>
        <Text style={styles.buttonText}>Retour à la connexion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  text: { color: '#555', marginBottom: 16 },
  button: { backgroundColor: '#111', padding: 12, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '700' },
});