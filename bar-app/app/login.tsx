import { useState } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { auth, db } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useAuth } from './context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';

export default function Login() {
  const router = useRouter();
  const { setUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = response.user;
      const userDoc = await getDoc(doc(db, 'utilisateurs', firebaseUser.uid));
      const role = userDoc.exists() ? (userDoc.data().role as 'admin' | 'serveur' | 'cuisine') : null;

      setUser({
        uid: firebaseUser.uid,
        email: firebaseUser.email || '',
        role: role,
      });
      console.log('Utilisateur connecté:', firebaseUser.email, 'Rôle:', role);
      // Redirection après connexion
      if (role === 'admin') {
        console.log('Redirection vers admin');
        router.replace('/admin');
        console.log('je suis encore dans la redirection');
      } else if (role === 'serveur') {
        console.log('Redirection vers serveur');
        router.replace('/serveur');
      } else if (role === 'cuisine') {
        console.log('Redirection vers cuisine');
        router.replace('/cuisine');
      }
      
    } catch (error: any) {
      Alert.alert('Erreur de connexion', error.message);
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