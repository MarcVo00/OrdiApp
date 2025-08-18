// app/admin/categories.tsx
import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { collection, onSnapshot, doc, setDoc, updateDoc, deleteDoc, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../firebase';
import ProtectedRoute from '../components/protectedRoute';
import NavBar from '../components/NavBar';

type Categorie = { id: string; nom: string };

export default function AdminCategories() {
  const [cats, setCats] = useState<Categorie[]>([]);
  const [newName, setNewName] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'categories'), orderBy('nom'));
    const unsub = onSnapshot(q, (snap) => {
      setCats(snap.docs.map((d) => ({ id: d.id, nom: (d.data() as any).nom || d.id })));
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(
    () => (search ? cats.filter((c) => c.nom.toLowerCase().includes(search.toLowerCase())) : cats),
    [cats, search]
  );

  const createCat = async () => {
    const name = newName.trim();
    if (!name) return Alert.alert('Nom requis', 'Entre un nom de catégorie.');
    // id simple dérivé du nom (tu peux préférer addDoc si tu veux un id auto)
    const id = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');
    try {
      await setDoc(doc(db, 'categories', id || name), { nom: name });
      setNewName('');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Création impossible');
    }
  };

  const renameCat = async (cat: Categorie) => {
    const next = typeof window !== 'undefined' ? (window.prompt('Nouveau nom :', cat.nom) || '') : '';
    const nom = next.trim();
    if (!nom || nom === cat.nom) return;
    try {
      await updateDoc(doc(db, 'categories', cat.id), { nom });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Renommage impossible');
    }
  };

  const deleteCat = async (cat: Categorie) => {
    try {
      // sécurité : refuse la suppression si des produits pointent vers cette catégorie
      const catRef = doc(db, 'categories', cat.id);
      const snap = await getDocs(query(collection(db, 'produits'), where('categorie', '==', catRef)));
      if (!snap.empty) {
        Alert.alert('Impossible', `Des produits utilisent "${cat.nom}". Supprime ou déplace-les d'abord.`);
        return;
      }
      const ok = typeof window !== 'undefined' && window.confirm
        ? window.confirm(`Supprimer la catégorie "${cat.nom}" ?`)
        : true;
      if (!ok) return;
      await deleteDoc(doc(db, 'categories', cat.id));
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Suppression impossible');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <View style={styles.container}>
        <Text style={styles.title}>Catégories (Admin)</Text>

        <View style={styles.row}>
          <TextInput
            placeholder="Nouvelle catégorie"
            value={newName}
            onChangeText={setNewName}
            style={[styles.input, { flex: 1 }]}
            onSubmitEditing={createCat}
          />
          <Pressable onPress={createCat} style={styles.primaryBtn}>
            <Text style={styles.btnText}>Créer</Text>
          </Pressable>
        </View>

        <TextInput
          placeholder="Rechercher…"
          value={search}
          onChangeText={setSearch}
          style={[styles.input, { marginTop: 8 }]}
        />

        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={{ fontWeight: '700', flex: 1 }}>{item.nom}</Text>
              <Pressable onPress={() => renameCat(item)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Renommer</Text>
              </Pressable>
              <Pressable onPress={() => deleteCat(item)} style={[styles.smallBtn, { backgroundColor: '#d32f2f' }]}>
                <Text style={styles.smallBtnText}>Supprimer</Text>
              </Pressable>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
      <NavBar />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  primaryBtn: { backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  card: { flexDirection: 'row', gap: 8, alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginTop: 10 },
  smallBtn: { backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '700' },
});
