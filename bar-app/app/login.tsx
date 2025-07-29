// login.tsx
import { useState, useEffect } from 'react';
import { View, Text, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';


export default function Login() {
  const { user ,login, role } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mount, setMount] = useState(false);

  console.log('Login component mounted');
  console.log('Current role:', role);
  console.log('Router:', router);
  console.log('Email:', email);
  console.log('Password:', password);

    useEffect(() => {
      if (!user || !role) return;
      console.log('User is authenticated, redirecting based on role:', role);
      console.log('Router before replace:', router);
      console.log('User:', user);
      if (role === 'admin') router.replace('/');
      else if (role === 'serveur') router.replace('/serveur');
      else if (role === 'cuisine') router.replace('/cuisine');
      else router.replace('/login'); // Rediriger vers la page de connexion si le rôle n'est pas reconnu
    }, [user, role, router]);


    useEffect(() => {
        setMount(true);
    }, []);
    if (!mount) return null; // Ne pas afficher le composant avant que le mount soit vrai
  const handleLogin = async () => {
    try {
      await login(email, password);
      console.log('Login successful');
  } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Erreur de connexion', 'Veuillez vérifier vos identifiants.');
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
