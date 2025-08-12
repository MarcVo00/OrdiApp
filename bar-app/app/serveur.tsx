// app/serveur.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet, Alert, FlatList
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDoc,
  query, orderBy
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/protectedRoute';
import NavBar from './components/NavBar';

type TableDoc = {
  id: string;                // docId = numéro de table (string)
  label?: string | null;
  active?: boolean;          // défaut true
  openCommandeId?: string | null;
};

export default function Serveur() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // ===== Saisie directe par numéro (serveur + admin)
  const [tableNumber, setTableNumber] = useState('');
  const goToCommande = () => {
    const t = parseInt(tableNumber, 10);
    if (!Number.isInteger(t) || t <= 0) {
      Alert.alert('Erreur', 'Saisis un numéro de table valide.');
      return;
    }
    router.replace(`/commande?table=${t}`);
  };

  // ===== Lecture des tables pour la grille
  const [tables, setTables] = useState<TableDoc[]>([]);
  useEffect(() => {
    const q = query(collection(db, 'tables'), orderBy('__name__')); // tri numérique via nom de doc
    const unsub = onSnapshot(q, (snap) => {
      setTables(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<TableDoc, 'id'>),
        }))
      );
    });
    return () => unsub();
  }, []);

  const ordered = useMemo(
    () => [...tables].sort((a, b) => Number(a.id) - Number(b.id)),
    [tables]
  );

  // ===== CRUD (admin uniquement)
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');

  const createTable = async () => {
    const id = newId.trim();
    if (!/^\d{1,4}$/.test(id)) {
      Alert.alert('Erreur', 'Utilise un identifiant numérique (1–4 chiffres).');
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
    // sur web : prompt, sur natif tu peux remplacer par un petit modal si tu préfères
    const label = typeof window !== 'undefined' ? (window.prompt('Nouveau label (laisser vide pour aucun)') || null) : null;
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

  // ===== Rendu
  return (
    <ProtectedRoute allowedRoles={['serveur', 'admin']}>
      <View style={styles.container}>
        <Text style={styles.title}>Prendre une commande</Text>

        {/* Saisie directe */}
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

        {/* Grille cliquable des tables (serveur + admin) */}
        <Text style={[styles.title, { marginTop: 16 }]}>Tables</Text>
        <FlatList
          data={ordered}
          keyExtractor={(t) => t.id}
          numColumns={4} // ajuste le nombre de colonnes selon ton layout
          columnWrapperStyle={{ gap: 10 }}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => {
            const hasOpen = Boolean(item.openCommandeId);
            const isInactive = item.active === false;
            return (
              <Pressable
                onPress={() => router.replace(`/commande?table=${item.id}`)}
                disabled={isInactive}
                style={[
                  styles.tile,
                  hasOpen && styles.tileOpen,
                  isInactive && styles.tileInactive,
                ]}
              >
                <Text style={styles.tileTitle}>Table {item.id}</Text>
                <Text style={styles.tileSub}>
                  {item.label ? item.label : '—'}
                </Text>
                <View style={styles.badgeRow}>
                  <Text style={[styles.badge, hasOpen ? styles.badgeWarn : styles.badgeOk]}>
                    {hasOpen ? 'Commande ouverte' : 'Libre'}
                  </Text>
                  {isInactive && <Text style={[styles.badge, styles.badgeMuted]}>Inactive</Text>}
                </View>
              </Pressable>
            );
          }}
        />

        {/* Section Admin : CRUD des tables */}
        {isAdmin && (
          <>
            <Text style={[styles.title, { marginTop: 8 }]}>Gestion des tables (admin)</Text>

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

            <FlatList
              data={ordered}
              keyExtractor={(t) => `admin-${t.id}`}
              renderItem={({ item }) => (
                <View style={styles.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '700' }}>Table {item.id}</Text>
                    <Text style={{ color: '#666' }}>{item.label || 'Sans label'}</Text>
                    <Text style={{ color: item.active === false ? '#9e9e9e' : '#2e7d32' }}>
                      {item.active === false ? 'Inactive' : 'Active'}
                    </Text>
                    <Text style={{ color: item.openCommandeId ? '#d32f2f' : '#666' }}>
                      {item.openCommandeId ? `Commande ouverte: ${item.openCommandeId}` : 'Aucune commande ouverte'}
                    </Text>
                  </View>
                  <View style={{ gap: 6 }}>
                    <Pressable onPress={() => toggleActive(item.id, item.active)} style={styles.smallBtn}>
                      <Text style={styles.smallBtnText}>{item.active === false ? 'Activer' : 'Désactiver'}</Text>
                    </Pressable>
                    <Pressable onPress={() => renameTable(item.id)} style={styles.smallBtn}>
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
            />
          </>
        )}
      </View>
      <NavBar />
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

  // Grille
  tile: {
    flex: 1,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    justifyContent: 'space-between',
  },
  tileOpen: { backgroundColor: '#FFF3E0', borderColor: '#FFE0B2' },     // orange clair
  tileInactive: { backgroundColor: '#F5F5F5', opacity: 0.6 },            // grisée
  tileTitle: { fontSize: 16, fontWeight: '800' },
  tileSub: { color: '#666', marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, color: '#fff', overflow: 'hidden' },
  badgeOk: { backgroundColor: '#2e7d32' },
  badgeWarn: { backgroundColor: '#ef6c00' },
  badgeMuted: { backgroundColor: '#9e9e9e' },

  // Admin
  createBtn: { backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  createBtnText: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginBottom: 10 },
  smallBtn: { backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '700' },
});
