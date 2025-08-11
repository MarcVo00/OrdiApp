import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, KeyboardAvoidingView, Platform, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import ProtectedRoute from './components/protectedRoute';
import NavBar from './components/NavBar';

// Page Serveur : saisie du numéro de table, puis redirection vers /commande?table=XX
// Accès: serveur + admin

const QUICK_TABLES = Array.from({ length: 20 }, (_, i) => String(i + 1)); // 1..20 (modifiable)

export default function Serveur() {
  const router = useRouter();
  const [tableNumber, setTableNumber] = useState('');

  const submit = () => {
    const t = parseInt(tableNumber, 10);
    if (!Number.isInteger(t) || t <= 0) {
      Alert.alert('Numéro invalide', 'Merci de saisir un numéro de table valide.');
      return;
    }
    // Bypass token côté staff : /commande l'accepte pour les rôles internes
    router.replace(`/commande?table=${t}`);
  };

  const pick = (t: string) => {
    setTableNumber(t);
    router.replace(`/commande?table=${t}`);
  };

  return (
    <ProtectedRoute allowedRoles={['serveur', 'admin']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.container}>
          <Text style={styles.title}>Prendre une commande</Text>

          <Text style={styles.label}>Numéro de table</Text>
          <TextInput
            placeholder="ex: 12"
            value={tableNumber}
            onChangeText={setTableNumber}
            keyboardType="numeric"
            inputMode="numeric"
            style={styles.input}
            returnKeyType="go"
            onSubmitEditing={submit}
          />

          <Pressable onPress={submit} style={styles.goBtn}>
            <Text style={styles.goBtnText}>Aller à la commande</Text>
          </Pressable>

          <Text style={[styles.label, { marginTop: 20 }]}>Sélection rapide</Text>
          <FlatList
            data={QUICK_TABLES}
            keyExtractor={(k) => k}
            numColumns={5}
            columnWrapperStyle={{ gap: 8 }}
            contentContainerStyle={{ gap: 8 }}
            renderItem={({ item }) => (
              <Pressable onPress={() => pick(item)} style={styles.quickBtn}>
                <Text style={styles.quickBtnText}>{item}</Text>
              </Pressable>
            )}
          />
        </View>
      </KeyboardAvoidingView>
      <NavBar />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  goBtn: { backgroundColor: '#111', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 12 },
  goBtnText: { color: '#fff', fontWeight: '700' },
  quickBtn: { flex: 1, backgroundColor: '#111', paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  quickBtnText: { color: '#fff', fontWeight: '700' },
});
