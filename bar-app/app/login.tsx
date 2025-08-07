// login.tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';
import {auth, db} from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { getDoc, doc } from 'firebase/firestore';


export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<'admin' | 'serveur' | 'cuisine' | null>(null);
  const authFirebase = auth;

  const handleLogin = async () => {
    setLoading(true);
    try {
      const response = await signInWithEmailAndPassword(authFirebase, email, password);
      setLoading(false);
      const user = response.user;
      const userDoc = await getDoc(doc(db, 'utilisateurs', user.uid));
      console.log('User document:', userDoc.data());
      console.log('User role:', userDoc.data()?.role);
      if (userDoc.exists()) {
        if (userDoc.data()?.role === 'admin') {
          setRole('admin');
          router.replace('/admin');
        } else if (userDoc.data()?.role === 'serveur') {
          setRole('serveur');
          router.replace('/serveur');
        } else if (userDoc.data()?.role === 'cuisine') {
          setRole('cuisine');
          router.replace('/cuisine');
        }
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Erreur de connexion', error.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    if (role) {
      console.log('User role after login:', role);
    }
  }, [role]);

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
      ) : null}
      <Button title="Se connecter" onPress={handleLogin} />
      <Button title="Créer un compte" onPress={() => router.push('/register')} />
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
