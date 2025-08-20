// app/pending.tsx
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

export default function Pending() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>⏳ En attente de validation</Text>
      <Text style={styles.text}>
        Votre compte a été créé et doit être validé par un administrateur.
      </Text>

      <Pressable onPress={() => router.replace('/login')} style={styles.button}>
        <Text style={styles.buttonText}>Retour à la connexion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, textAlign: 'center' },
  text: { fontSize: 16, textAlign: 'center', marginBottom: 24 },
  button: { backgroundColor: '#111', padding: 12, borderRadius: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
});
