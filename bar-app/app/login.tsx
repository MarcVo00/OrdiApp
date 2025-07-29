// login.tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';

export default function Login() {
  const { user, login, role } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mount, setMount] = useState(false);

  // Redirection après login
  useEffect(() => {
    console.log('🧭 useEffect triggered with:', { user, role });
    if (!user || !role) return;

    console.log('✅ Redirection en cours, rôle :', role);
    if (role === 'admin') router.replace('/');
    else if (role === 'serveur') router.replace('/serveur');
    else if (role === 'cuisine') router.replace('/cuisine');
    else Alert.alert('Erreur', 'Rôle inconnu');
  }, [user, role]);

  useEffect(() => {
    setMount(true);
  }, []);
  if (!mount) return null;

  const handleLogin = async () => {
    try {
      await login(email, password);
      // Pas besoin d'alerte ici : redirection automatique
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur de connexion', 'Identifiants incorrects ou utilisateur non reconnu.');
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
