// =============================
// app/register.tsx
// =============================
import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useRouter } from 'expo-router';

function mapAuthError(code?: string) {
  switch (code) {
    case 'auth/email-already-in-use': return 'Cet email est déjà utilisé.';
    case 'auth/invalid-email': return 'Email invalide.';
    case 'auth/weak-password': return 'Mot de passe trop faible (min. 6 caractères).';
    case 'auth/operation-not-supported-in-this-environment':
      return "Safari/PWA : stockage indisponible. Essayez hors navigation privée ou installez l'app depuis le navigateur.";
    case 'auth/network-request-failed': return 'Problème réseau. Vérifiez votre connexion.';
    default: return undefined;
  }
}

export default function Register() {
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    if (!nom || !prenom || !email || !password || !confirmPassword) {
      Alert.alert('Erreur', 'Tous les champs sont requis.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const normEmail = email.trim().toLowerCase();
      const cred = await createUserWithEmailAndPassword(auth, normEmail, password);

      // Crée SON document profil (autorisé par tes règles)
      await setDoc(doc(db, 'utilisateurs', cred.user.uid), {
        nom: nom.trim(),
        prenom: prenom.trim(),
        email: normEmail,
        role: null,              // défini plus tard par un admin
        valide: false,           // en attente de validation
        createdAt: Timestamp.now(),
        updatedAt: serverTimestamp(),
      }, { merge: true });

      Alert.alert('Compte créé', 'Votre compte est en attente de validation par un administrateur.');
      router.replace('/pending');
    } catch (e: any) {
      const pretty = mapAuthError(e?.code) ?? e?.message ?? 'Erreur inconnue';
      Alert.alert('Inscription impossible', pretty);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Créer un compte</Text>

      <TextInput
        placeholder="Prénom"
        value={prenom}
        onChangeText={setPrenom}
        style={styles.input}
        autoCapitalize="words"
        autoComplete="given-name"
      />

      <TextInput
        placeholder="Nom"
        value={nom}
        onChangeText={setNom}
        style={styles.input}
        autoCapitalize="words"
        autoComplete="family-name"
      />

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        style={styles.input}
        autoCapitalize="none"
        keyboardType="email-address"
        inputMode="email"
        autoComplete="email"
      />

      <TextInput
        placeholder="Mot de passe"
        value={password}
        onChangeText={setPassword}
        style={styles.input}
        secureTextEntry
        autoComplete="new-password"
      />

      <TextInput
        placeholder="Confirmer le mot de passe"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        style={styles.input}
        secureTextEntry
        autoComplete="new-password"
      />

      {loading ? (
        <ActivityIndicator />
      ) : (
        <Pressable onPress={onSubmit} style={styles.button}>
          <Text style={styles.buttonText}>S&apos;inscrire</Text>
        </Pressable>
      )}

      <Pressable onPress={() => router.replace('/login')} style={{ alignItems: 'center', marginTop: 8 }}>
        <Text>Déjà un compte ? Se connecter</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 6, padding: 12, marginBottom: 12 },
  button: { backgroundColor: '#111', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 6 },
  buttonText: { color: '#fff', fontWeight: '700' },
});
