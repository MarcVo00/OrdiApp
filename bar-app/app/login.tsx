// login.tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';


export default function Login() {
  const { login, role } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  console.log('Login component mounted');
  console.log('Current role:', role);
  console.log('Router:', router);
  console.log('Email:', email);
  console.log('Password:', password);

    const [mount, setMount] = useState(false);
    useEffect(() => {
        setMount(true);
    }, []);
    if (!mount) return null; // Ne pas afficher le composant avant que le mount soit vrai
  const handleLogin = async () => {
    try {
      await login(email, password);
      if (role === 'admin') router.replace('/');
      else if (role === 'serveur') router.replace('/serveur');
      else if (role === 'cuisine') router.replace('/cuisine');
      else Alert.alert('Aucun rôle attribué.');
    } catch (e) {
      Alert.alert('Erreur', 'Email ou mot de passe invalide');
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
