// app/admin/produits.tsx
import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import {
  collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc,
  query, orderBy, where, getDocs
} from 'firebase/firestore';
import { db } from '../../firebase';
import ProtectedRoute from '../components/protectedRoute';

type Categorie = { id: string; nom: string };
type ProduitRow = { id: string; nom: string; prix: number; disponible: boolean; categorieId?: string; categorieNom?: string };

export default function AdminProduits() {
  // Catégories pour le sélecteur
  const [cats, setCats] = useState<Categorie[]>([]);
  // Liste produits
  const [rows, setRows] = useState<ProduitRow[]>([]);

  // Formulaire
  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  const [categorieId, setCategorieId] = useState<string | undefined>(undefined);
  const [disponible, setDisponible] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | 'all'>('all');

  useEffect(() => {
    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('nom')), (snap) => {
      setCats(snap.docs.map((d) => ({ id: d.id, nom: (d.data() as any).nom || d.id })));
    });
    const unsubProds = onSnapshot(query(collection(db, 'produits'), orderBy('nom')), async (snap) => {
      const catMap = new Map<string, string>();
      cats.forEach((c) => catMap.set(c.id, c.nom)); // initial map (sera mis à jour à chaque render)
      const list: ProduitRow[] = [];
      for (const d of snap.docs) {
        const x = d.data() as any;
        // tente de récupérer le nom de la catégorie depuis la référence
        let cId: string | undefined;
        let cNom: string | undefined;
        if (x.categorie?.path) {
          cId = x.categorie.id; // doc ref id
          cNom = cId ? catMap.get(cId) : undefined;
          if (cId && !cNom) {
            try {
              const refSnap = await getDocs(query(collection(db, 'categories'), where('__name__', '==', cId)));
              if (!refSnap.empty) cNom = (refSnap.docs[0].data() as any).nom;
            } catch {}
          }
        }
        list.push({
          id: d.id,
          nom: x.nom,
          prix: Number(x.prix),
          disponible: x.disponible !== false,
          categorieId: cId,
          categorieNom: cNom,
        });
      }
      setRows(list);
    });
    return () => { unsubCats(); unsubProds(); };
  }, [cats.length]); // refresh quand la taille des catégories change

  const filtered = useMemo(() => {
    let base = rows;
    if (catFilter !== 'all') base = base.filter((r) => r.categorieId === catFilter);
    if (search) base = base.filter((r) => r.nom.toLowerCase().includes(search.toLowerCase()));
    return base;
  }, [rows, search, catFilter]);

  const resetForm = () => { setNom(''); setPrix(''); setCategorieId(undefined); setDisponible(true); };

  const createProduct = async () => {
    const name = nom.trim();
    const p = parseFloat(prix);
    if (!name || Number.isNaN(p)) {
      return Alert.alert('Champs requis', 'Nom et prix valides sont requis.');
    }
    try {
      const data: any = { nom: name, prix: p, disponible };
      if (categorieId) data.categorie = doc(collection(db, 'categories'), categorieId);
      await addDoc(collection(db, 'produits'), data);
      resetForm();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Création impossible');
    }
  };

  const toggleDispo = async (r: ProduitRow) => {
    try {
      await updateDoc(doc(db, 'produits', r.id), { disponible: !r.disponible });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Mise à jour impossible');
    }
  };

  const editPrice = async (r: ProduitRow) => {
    const s = typeof window !== 'undefined' ? (window.prompt('Nouveau prix', String(r.prix)) || '') : '';
    const p = parseFloat(s);
    if (Number.isNaN(p)) return;
    try {
      await updateDoc(doc(db, 'produits', r.id), { prix: p });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Mise à jour impossible');
    }
  };

  const moveCategory = async (r: ProduitRow) => {
    try {
      const next = typeof window !== 'undefined' ? (window.prompt('ID de catégorie (laisse vide pour aucune)', r.categorieId || '') || '' ) : '';
      const id = next.trim();
      const patch: any = {};
      if (!id) patch.categorie = null;
      else patch.categorie = doc(collection(db, 'categories'), id);
      await updateDoc(doc(db, 'produits', r.id), patch);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Changement de catégorie impossible');
    }
  };

  const removeProduct = async (r: ProduitRow) => {
    const ok = typeof window !== 'undefined' && window.confirm
      ? window.confirm(`Supprimer ${r.nom} ?`)
      : true;
    if (!ok) return;
    try {
      await deleteDoc(doc(db, 'produits', r.id));
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Suppression impossible');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <View style={styles.container}>
        <Text style={styles.title}>Produits (Admin)</Text>

        {/* Formulaire de création */}
        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={styles.sectionTitle}>Nouveau produit</Text>
          <View style={{ flexDirection: 'row', gap: 8, width: '100%', flexWrap: 'wrap' }}>
            <TextInput placeholder="Nom" value={nom} onChangeText={setNom} style={[styles.input, { flex: 1, minWidth: 220 }]} />
            <TextInput placeholder="Prix" value={prix} onChangeText={setPrix} keyboardType="numeric" inputMode="decimal" style={[styles.input, { width: 120 }]} />
            <TextInput
              placeholder="ID Catégorie (optionnel)"
              value={categorieId || ''}
              onChangeText={setCategorieId}
              style={[styles.input, { minWidth: 220, flex: 1 }]}
            />
            <Pressable onPress={() => setDisponible((d) => !d)} style={[styles.smallBtn, disponible ? styles.ok : styles.muted]}>
              <Text style={styles.smallBtnText}>{disponible ? 'Disponible' : 'Indispo'}</Text>
            </Pressable>
            <Pressable onPress={createProduct} style={[styles.primaryBtn, { flexGrow: 1 }]}>
              <Text style={styles.btnText}>Créer</Text>
            </Pressable>
          </View>

          {/* Aide : afficher les catégories dispos */}
          <View style={{ width: '100%', marginTop: 8 }}>
            <Text style={{ fontWeight: '600', marginBottom: 6 }}>Catégories existantes :</Text>
            <FlatList
              data={cats}
              horizontal
              keyExtractor={(c) => c.id}
              contentContainerStyle={{ gap: 8 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => setCategorieId(item.id)} style={[styles.chip, categorieId === item.id && styles.chipActive]}>
                  <Text style={categorieId === item.id ? styles.chipTextActive : styles.chipText}>
                    {item.nom} ({item.id})
                  </Text>
                </Pressable>
              )}
              showsHorizontalScrollIndicator={false}
            />
          </View>
        </View>

        {/* Filtres */}
        <View style={[styles.card, { flexDirection: 'row', gap: 8, alignItems: 'center' }]}>
          <TextInput placeholder="Rechercher…" value={search} onChangeText={setSearch} style={[styles.input, { flex: 1 }]} />
          <TextInput
            placeholder="Filtrer par ID catégorie (ou vide)"
            value={catFilter === 'all' ? '' : (catFilter as string)}
            onChangeText={(v) => setCatFilter(v.trim() ? v.trim() : 'all')}
            style={[styles.input, { width: 240 }]}
          />
        </View>

        {/* Tableau produits */}
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <View style={styles.rowItem}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '700' }}>{item.nom}</Text>
                <Text style={{ color: '#666' }}>
                  {item.categorieNom ? `Cat: ${item.categorieNom} (${item.categorieId})` : item.categorieId ? `CatID: ${item.categorieId}` : 'Sans catégorie'}
                </Text>
              </View>
              <Text style={{ width: 80, textAlign: 'right' }}>{item.prix.toFixed(2)}</Text>
              <Pressable onPress={() => toggleDispo(item)} style={[styles.smallBtn, item.disponible ? styles.ok : styles.muted]}>
                <Text style={styles.smallBtnText}>{item.disponible ? 'On' : 'Off'}</Text>
              </Pressable>
              <Pressable onPress={() => editPrice(item)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Prix</Text>
              </Pressable>
              <Pressable onPress={() => moveCategory(item)} style={styles.smallBtn}>
                <Text style={styles.smallBtnText}>Catégorie</Text>
              </Pressable>
              <Pressable onPress={() => removeProduct(item)} style={[styles.smallBtn, { backgroundColor: '#d32f2f' }]}>
                <Text style={styles.smallBtnText}>Suppr.</Text>
              </Pressable>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  sectionTitle: { fontWeight: '700', alignSelf: 'flex-start', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  primaryBtn: { backgroundColor: '#111', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '700' },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: '#fafafa' },

  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: '#ddd' },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#111' },
  chipTextActive: { color: '#fff' },

  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginTop: 8 },

  smallBtn: { backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  ok: { backgroundColor: '#2e7d32' },
  muted: { backgroundColor: '#9e9e9e' },
});
