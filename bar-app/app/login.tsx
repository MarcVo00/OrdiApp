// login.tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';

export default function Login() {
  const { user, login, role } = useAuth();
  console.log('Current user:', user);
  console.log('Current role:', role);
  console.log('Auth context:', { user, role, login });
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (user && role === null) {
      Alert.alert('Compte non validé', 'Un administrateur doit valider votre accès.');
    }

    if (!user || !role) return;

    if (role === 'admin') router.replace('/');
    else if (role === 'serveur') router.replace('/serveur');
    else if (role === 'cuisine') router.replace('/cuisine');
    else Alert.alert('Erreur', 'Rôle inconnu');
  }, [user, role]);

  const handleLogin = async () => {
    try {
      await login(email, password);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur de connexion', 'Identifiants incorrects ou utilisateur inexistant.');
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
