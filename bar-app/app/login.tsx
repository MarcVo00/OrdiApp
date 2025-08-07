import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from './context/AuthContext';
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserRole } from './context/AuthContext';


export default function Login() {
  const router = useRouter();
  const { refreshUserData } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuth();

  const handleLogin = async () => {
  setLoading(true);
  try {
    const response = await signInWithEmailAndPassword(auth, email, password);
    const userDoc = await getDoc(doc(db, 'utilisateurs', response.user.uid));
    
    const role = userDoc.exists() ? userDoc.data().role as UserRole : null;
    
    setUser({
      uid: response.user.uid,
      email: response.user.email || '',
      role: role
    });

    router.replace('/'); // La redirection sera gérée par index.tsx
  } catch (error) {
    Alert.alert('Erreur', 'Identifiants incorrects');
  } finally {
    setLoading(false);
  }
};
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Connexion</Text>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={styles.input}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#0000ff" />
      ) : (
        <>
          <Button title="Se connecter" onPress={handleLogin} />
          <Button title="Créer un compte" onPress={() => router.push('/register')} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 24 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
});