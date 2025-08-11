import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from './context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      // 1. Authentification Firebase
      await signInWithEmailAndPassword(auth, email, password);
      
      // 2. Récupération des données utilisateur
      const userData = await refreshUser();
      
      if (!userData) {
        throw new Error("Aucune donnée utilisateur trouvée");
      }

      // 3. Redirection en fonction du statut
      if (!userData.valide) {
        router.replace('/pending');
      } else {
        // Le ProtectedRoute gérera la redirection finale
        router.replace('/');
      }
    } catch (error: any) {
      // ... (gestion des erreurs inchangée)
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
      
      <Pressable
        style={[styles.button, loading && styles.disabled]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Connexion...' : 'Se connecter'}
        </Text>
      </Pressable>
      
      <Pressable
        style={styles.secondaryButton}
        onPress={() => router.push('/register')}
      >
        <Text style={styles.secondaryButtonText}>Créer un compte</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#000',
    padding: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  secondaryButton: {
    padding: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#666',
  },
});