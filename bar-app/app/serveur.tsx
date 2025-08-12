// app/serveur.tsx
import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/protectedRoute';

type TableDoc = {
  id: string;         // = docId (numéro de table en string)
  label?: string;     // optionnel (ex: “Terrasse 1”)
  active?: boolean;   // par défaut true
  openCommandeId?: string | null;
};

export default function Serveur() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // ----- Saisie rapide pour le staff
  const [tableNumber, setTableNumber] = useState('');
  const goToCommande = () => {
    const t = parseInt(tableNumber, 10);
    if (!Number.isInteger(t) || t <= 0) {
      Alert.alert('Erreur', 'Saisis un numéro de table valide.');
      return;
    }
    router.replace(`/commande?table=${t}`);
  };

  // ----- Listing des tables (admin)
  const [tables, setTables] = useState<TableDoc[]>([]);
  useEffect(() => {
    if (!isAdmin) return;
    const q = query(collection(db, 'tables'), orderBy('__name__'));
    const unsub = onSnapshot(q, (snap) => {
      setTables(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TableDoc, 'id'>),
        }))
      );
    });
    return () => unsub();
  }, [isAdmin]);

  // ----- Création / Update / Delete (admin)
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const createTable = async () => {
    const id = newId.trim();
    if (!/^\d{1,4}$/.test(id)) {
      Alert.alert('Erreur', 'Utilise un identifiant numérique (1-4 chiffres).');
      return;
    }
    const ref = doc(db, 'tables', id);
    const exist = await getDoc(ref);
    if (exist.exists()) {
      Alert.alert('Conflit', `La table ${id} existe déjà.`);
      return;
    }
    await setDoc(ref, { label: newLabel || null, active: true, openCommandeId: null });
    setNewId(''); setNewLabel('');
  };

  const toggleActive = async (id: string, active?: boolean) => {
    await updateDoc(doc(db, 'tables', id), { active: !active });
  };

  const renameTable = async (id: string) => {
    const label = prompt('Nouveau label (laisser vide pour aucun label)') || null;
    await updateDoc(doc(db, 'tables', id), { label });
  };

  const removeTable = async (id: string, openCommandeId?: string | null) => {
    if (openCommandeId) {
      Alert.alert('Impossible', 'La table a une commande ouverte. Fermez-la d’abord.');
      return;
    }
    const ok = typeof window !== 'undefined' && window.confirm
      ? window.confirm(`Supprimer la table ${id} ?`)
      : true;
    if (!ok) return;
    await deleteDoc(doc(db, 'tables', id));
  };

  const ordered = useMemo(
    () => [...tables].sort((a, b) => Number(a.id) - Number(b.id)),
    [tables]
  );

  return (
    <ProtectedRoute allowedRoles={['serveur', 'admin']}>
      <View style={styles.container}>
        <Text style={styles.title}>Prendre une commande</Text>

        {/* Staff: choisir une table et aller sur /commande */}
        <Text style={styles.label}>Numéro de table</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TextInput
            placeholder="ex: 12"
            value={tableNumber}
            onChangeText={setTableNumber}
            keyboardType="numeric"
            inputMode="numeric"
            style={[styles.input, { flex: 1 }]}
            returnKeyType="go"
            onSubmitEditing={goToCommande}
          />
          <Pressable onPress={goToCommande} style={styles.goBtn}>
            <Text style={styles.goBtnText}>Aller</Text>
          </Pressable>
        </View>

        {/* Admin: gestion des tables */}
        {isAdmin && (
          <>
            <Text style={[styles.title, { marginTop: 24 }]}>Gestion des tables (admin)</Text>

            {/* Création */}
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <TextInput
                placeholder="ID (numérique)"
                value={newId}
                onChangeText={setNewId}
                keyboardType="numeric"
                inputMode="numeric"
                style={[styles.input, { width: 120 }]}
              />
              <TextInput
                placeholder="Label (optionnel)"
                value={newLabel}
                onChangeText={setNewLabel}
                style={[styles.input, { flex: 1 }]}
              />
              <Pressable onPress={createTable} style={styles.createBtn}>
                <Text style={styles.createBtnText}>Créer</Text>
              </Pressable>
            </View>

            {/* Liste */}
            <FlatList
              data={ordered}
              keyExtractor={(t) => t.id}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>Table {item.id}</Text>
                    <Text style={{ color: '#666' }}>
                      {item.label ? `Label: ${item.label}` : 'Sans label'}
                    </Text>
                    <Text style={{ color: item.active ? '#2e7d32' : '#9e9e9e' }}>
                      {item.active ? 'Active' : 'Inactive'}
                    </Text>
                    <Text style={{ color: item.openCommandeId ? '#d32f2f' : '#666' }}>
                      {item.openCommandeId ? `Commande ouverte: ${item.openCommandeId}` : 'Aucune commande ouverte'}
                    </Text>
                  </View>

                  <View style={{ gap: 6 }}>
                    <Pressable onPress={() => toggleActive(item.id, item.active)} style={[styles.smallBtn]}>
                      <Text style={styles.smallBtnText}>{item.active ? 'Désactiver' : 'Activer'}</Text>
                    </Pressable>
                    <Pressable onPress={() => renameTable(item.id)} style={[styles.smallBtn]}>
                      <Text style={styles.smallBtnText}>Renommer</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => removeTable(item.id, item.openCommandeId)}
                      style={[styles.smallBtn, { backgroundColor: '#d32f2f' }]}
                    >
                      <Text style={styles.smallBtnText}>Supprimer</Text>
                    </Pressable>
                  </View>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </>
        )}
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 10 },
  label: { fontWeight: '600', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  goBtn: { backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
  goBtnText: { color: '#fff', fontWeight: '700' },
  createBtn: { backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  createBtnText: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginBottom: 10 },
  smallBtn: { backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '700' },
});
