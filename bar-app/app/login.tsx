// =============================
// app/login.tsx
// =============================
import { useState } from 'react';
import { View, Text, TextInput, Pressable, ActivityIndicator, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from './context/AuthContext';

function mapAuthError(code?: string) {
  switch (code) {
    case 'auth/invalid-email': return 'Email invalide.';
    case 'auth/user-disabled': return 'Compte désactivé.';
    case 'auth/user-not-found': return "Aucun compte trouvé pour cet email.";
    case 'auth/wrong-password': return 'Mot de passe incorrect.';
    case 'auth/too-many-requests': return 'Trop de tentatives, réessayez plus tard.';
    case 'auth/network-request-failed': return 'Problème réseau. Vérifiez votre connexion.';
    default: return undefined;
  }
}

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
      // Le hook useAuth.login doit :
      // - appeler signInWithEmailAndPassword
      // - récupérer le doc Firestore `utilisateurs/{uid}`
      // - le retourner sous forme ({ role, valide, ... })
      const profile = await login(email.trim().toLowerCase(), password);

      if (!profile) {
        Alert.alert(
          'Profil introuvable',
          "Votre compte est authentifié mais le profil n'existe pas dans Firestore.\nContactez un administrateur."
        );
        return;
      }

      if (profile.valide !== true) {
        // Non validé -> attente
        router.replace('/pending');
        return;
      }

      // Redirection selon le rôle
      switch (profile.role) {
        case 'admin':
          router.replace('/admin/settings');
          break;
        case 'serveur':
          router.replace('/serveur');
          break;
        case 'cuisine':
          router.replace('/cuisine');
          break;
        default:
          router.replace('/');
      }
    } catch (e: any) {
      const pretty = mapAuthError(e?.code) ?? e?.message ?? 'Erreur inconnue';
      Alert.alert('Connexion impossible', pretty);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 12, backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 28, fontWeight: '800', marginBottom: 8 }}>Connexion</Text>

      <TextInput
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}
      />

      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        style={{ borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 }}
      />

      {(loading || submitting) && <ActivityIndicator />}

      <Pressable
        onPress={onSubmit}
        disabled={loading || submitting}
        style={{ opacity: loading || submitting ? 0.6 : 1, backgroundColor: '#111', padding: 12, borderRadius: 10, alignItems: 'center' }}
      >
        <Text style={{ color: 'white', fontWeight: '700' }}>Se connecter</Text>
      </Pressable>

      <Pressable onPress={() => router.push('/register')} style={{ padding: 12, alignItems: 'center' }}>
        <Text>Créer un compte</Text>
      </Pressable>

      {Platform.OS === 'web' && (
        <Text style={{ color: '#999', fontSize: 12, textAlign: 'center', marginTop: 8 }}>
          Astuce iOS (PWA) : évitez le mode privé et activez la persistance dans votre config Firebase Auth.
        </Text>
      )}
    </View>
  );
}
