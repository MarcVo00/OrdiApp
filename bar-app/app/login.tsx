// app/login.tsx
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';

export default function Login() {
  const router = useRouter();
  const { login, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Email et mot de passe requis.');
      return;
    }
    setSubmitting(true);
    try {
      const profile = await login(email.trim(), password);
      // Redirection selon le rôle
      if (profile.role === 'admin') router.replace('/admin');
      else if (profile.role === 'serveur') router.replace('/serveur');
      else if (profile.role === 'cuisine') router.replace('/cuisine');
      else router.replace('/');
    } catch (e: any) {
      Alert.alert('Connexion impossible', e?.message ?? 'Erreur inconnue');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8 }}>Connexion</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}
      />
      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}
      />

      {(loading || submitting) && <ActivityIndicator />}

      <Pressable onPress={onSubmit} style={{ backgroundColor: '#111', padding: 12, borderRadius: 10, alignItems: 'center' }}>
        <Text style={{ color: 'white', fontWeight: '700' }}>Se connecter</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/register')} style={{ padding: 12, alignItems: 'center' }}>
        <Text>Créer un compte</Text>
      </Pressable>
    </View>
  );
}