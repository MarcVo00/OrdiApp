// app/admin/produits.tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, FlatList, Alert, Platform, Image } from 'react-native';
import {collection, onSnapshot, doc, setDoc, addDoc, updateDoc, deleteDoc, query, orderBy, where, getDocs} from 'firebase/firestore';
import { db } from '../../firebase';
import ProtectedRoute from '../components/protectedRoute';
import NavBar from '../components/NavBar';

// 👉 ajoute ces imports (firebase storage)
import { storage } from '../../firebase';
import { ref as sRef, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

type Categorie = { id: string; nom: string };
type ProduitRow = {
  id: string;
  nom: string;
  prix: number;
  disponible: boolean;
  description?: string;
  imageUrl?: string | null;
  imagePath?: string | null;
  categorieId?: string;
  categorieNom?: string;
};

export default function AdminProduits() {
  // Catégories pour le sélecteur
  const [cats, setCats] = useState<Categorie[]>([]);
  // Liste produits
  const [rows, setRows] = useState<ProduitRow[]>([]);

  // Formulaire
  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  const [description, setDescription] = useState('');
  const [categorieId, setCategorieId] = useState<string | undefined>(undefined);
  const [disponible, setDisponible] = useState(true);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string | 'all'>('all');

  // ---- input file caché (web) pour upload image (création + édition) ----
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingProductId, setPendingProductId] = useState<string | null>(null);

  useEffect(() => {
    const unsubCats = onSnapshot(query(collection(db, 'categories'), orderBy('nom')), (snap) => {
      setCats(snap.docs.map((d) => ({ id: d.id, nom: (d.data() as any).nom || d.id })));
    });
    const unsubProds = onSnapshot(query(collection(db, 'produits'), orderBy('nom')), async (snap) => {
      const catMap = new Map<string, string>();
      cats.forEach((c) => catMap.set(c.id, c.nom));
      const list: ProduitRow[] = [];
      for (const d of snap.docs) {
        const x = d.data() as any;
        let cId: string | undefined;
        let cNom: string | undefined;
        if (x.categorie?.path) {
          cId = x.categorie.id;
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
          description: x.description || '',
          imageUrl: x.imageUrl ?? null,
          imagePath: x.imagePath ?? null,
          categorieId: cId,
          categorieNom: cNom,
        });
      }
      setRows(list);
    });
    return () => { unsubCats(); unsubProds(); };
  }, [cats.length]);

  const filtered = useMemo(() => {
    let base = rows;
    if (catFilter !== 'all') base = base.filter((r) => r.categorieId === catFilter);
    if (search) base = base.filter((r) =>
      r.nom.toLowerCase().includes(search.toLowerCase())
      || (r.description ?? '').toLowerCase().includes(search.toLowerCase())
    );
    return base;
  }, [rows, search, catFilter]);

  const resetForm = () => {
    setNom(''); setPrix(''); setDescription(''); setCategorieId(undefined); setDisponible(true);
    // reset file input si besoin
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // -------- Création produit (avec upload image) --------
  const createProduct = async () => {
    const name = nom.trim();
    const p = parseFloat(prix);
    if (!name || Number.isNaN(p)) {
      return Alert.alert('Champs requis', 'Nom et prix valides sont requis.');
    }
    try {
      // 1) créer le doc (on veut un id pour nommer le fichier image)
      const newRef = doc(collection(db, 'produits'));
      const data: any = { nom: name, prix: p, disponible, description: description.trim() || '' };
      if (categorieId) data.categorie = doc(collection(db, 'categories'), categorieId);
      await setDoc(newRef, data);

      // 2) upload image si fournie (web)
      if (Platform.OS === 'web' && fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files[0]) {
        const file = fileInputRef.current.files[0];
        const path = `produits/${newRef.id}/${Date.now()}_${file.name}`;
        const fileRef = sRef(storage, path);
        await uploadBytes(fileRef, file);
        const url = await getDownloadURL(fileRef);
        await updateDoc(newRef, { imageUrl: url, imagePath: path });
      }

      resetForm();
      Alert.alert('OK', 'Produit créé.');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Création impossible');
    }
  };

  // -------- MAJ de description --------
  const editDescription = async (r: ProduitRow) => {
    const next = typeof window !== 'undefined'
      ? (window.prompt('Nouvelle description :', r.description ?? '') || '')
      : '';
    const desc = next.trim();
    try {
      await updateDoc(doc(db, 'produits', r.id), { description: desc });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Mise à jour impossible');
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
      const next = typeof window !== 'undefined' ? (window.prompt('ID de catégorie (vide pour aucune)', r.categorieId || '') || '' ) : '';
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
      // supprimer image dans le storage si présente
      if (r.imagePath) {
        try { await deleteObject(sRef(storage, r.imagePath)); } catch {}
      }
      await deleteDoc(doc(db, 'produits', r.id));
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Suppression impossible');
    }
  };

  // -------- Changer l'image d'un produit existant (web) --------
  const startChangeImage = (productId: string) => {
    setPendingProductId(productId);
    if (Platform.OS === 'web') fileInputRef.current?.click();
  };

  const onFileChange = async (ev: any) => {
    try {
      if (!pendingProductId) return;
      const file: File | undefined = ev?.target?.files?.[0];
      if (!file) return;
      const prod = rows.find(r => r.id === pendingProductId);
      if (!prod) return;

      const path = `produits/${pendingProductId}/${Date.now()}_${file.name}`;
      const fileRef = sRef(storage, path);
      await uploadBytes(fileRef, file);
      const url = await getDownloadURL(fileRef);

      // supprimer l’ancienne image si existait
      if (prod.imagePath) {
        try { await deleteObject(sRef(storage, prod.imagePath)); } catch {}
      }

      await updateDoc(doc(db, 'produits', pendingProductId), { imageUrl: url, imagePath: path });
      setPendingProductId(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Upload impossible');
    }
  };

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <View style={styles.container}>
        <Text style={styles.title}>Produits (Admin)</Text>

        {/* Formulaire de création */}
        <View style={[styles.card, { alignItems: 'center' }]}>
          <Text style={styles.sectionTitle}>Nouveau produit</Text>
          <View style={{ width: '100%', gap: 8 }}>
            <TextInput placeholder="Nom" value={nom} onChangeText={setNom} style={styles.input} />
            <TextInput placeholder="Prix" value={prix} onChangeText={setPrix} keyboardType="numeric" inputMode="decimal" style={styles.input} />
            <TextInput
              placeholder="Description (optionnel)"
              value={description}
              onChangeText={setDescription}
              style={[styles.input, { minHeight: 80 }]}
              multiline
            />
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <Pressable onPress={() => setDisponible((d) => !d)} style={[styles.smallBtn, disponible ? styles.ok : styles.muted]}>
                <Text style={styles.smallBtnText}>{disponible ? 'Disponible' : 'Indispo'}</Text>
              </Pressable>
              <Pressable onPress={createProduct} style={[styles.primaryBtn, { flexGrow: 1 }]}>
                <Text style={styles.btnText}>Créer</Text>
              </Pressable>
            </View>

            {/* Sélection de catégorie */}
            <View style={{ marginTop: 8 }}>
              <Text style={{ fontWeight: '600', marginBottom: 6 }}>Catégories existantes :</Text>
              <FlatList
                data={cats}
                horizontal
                keyExtractor={(c) => c.id}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => (
                  <Pressable onPress={() => setCategorieId(item.id)} style={[styles.chip, categorieId === item.id && styles.chipActive]}>
                    <Text style={categorieId === item.id ? styles.chipTextActive : styles.chipText}>
                      {item.nom}
                    </Text>
                  </Pressable>
                )}
                showsHorizontalScrollIndicator={false}
              />
            </View>

            {/* Input fichier pour image (web) */}
            {Platform.OS === 'web' && (
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                style={{ marginTop: 8 }}
                onChange={(e) => {/* on ne déclenche rien ici en création : upload au moment du "Créer" */}}
              />
            )}
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
              {/* Visuel */}
              {item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={{ width: 64, height: 64, borderRadius: 8, marginRight: 10 }} />
              ) : (
                <View style={{ width: 64, height: 64, borderRadius: 8, marginRight: 10, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#999', fontSize: 12 }}>Aucune image</Text>
                </View>
              )}

              {/* Infos */}
              <View style={{ flex: 1 }}>
                <Text style={styles.productName}>{item.nom}</Text>
                {item.categorieNom && <Text style={styles.infoText}>Catégorie : {item.categorieNom}</Text>}
                <Text style={styles.infoText}>Prix : {item.prix.toFixed(2)} CHF</Text>
                <Text style={styles.infoText}>Statut : {item.disponible ? 'Disponible' : 'Indisponible'}</Text>
                {!!item.description && <Text style={[styles.infoText, { marginTop: 4 }]} numberOfLines={2}>📝 {item.description}</Text>}
              </View>

              {/* Actions */}
              <View style={{ gap: 6, alignItems: 'stretch' }}>
                <Pressable onPress={() => toggleDispo(item)} style={[styles.smallBtn, item.disponible ? styles.ok : styles.muted]}>
                  <Text style={styles.smallBtnText}>{item.disponible ? 'On' : 'Off'}</Text>
                </Pressable>
                <Pressable onPress={() => editPrice(item)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Prix</Text>
                </Pressable>
                <Pressable onPress={() => moveCategory(item)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Catégorie</Text>
                </Pressable>
                <Pressable onPress={() => editDescription(item)} style={styles.smallBtn}>
                  <Text style={styles.smallBtnText}>Description</Text>
                </Pressable>
                {Platform.OS === 'web' && (
                  <Pressable onPress={() => startChangeImage(item.id)} style={styles.smallBtn}>
                    <Text style={styles.smallBtnText}>📷 Image</Text>
                  </Pressable>
                )}
                <Pressable onPress={() => removeProduct(item)} style={[styles.smallBtn, { backgroundColor: '#d32f2f' }]}>
                  <Text style={styles.smallBtnText}>Suppr.</Text>
                </Pressable>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      </View>

      {/* input de changement d'image (web) — unique et caché */}
      {Platform.OS === 'web' && (
        <input
          ref={fileInputRef as any}
          type="file"
          accept="image/*"
          onChange={onFileChange as any}
          style={{ display: 'none' }}
        />
      )}

      <NavBar />
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

  rowItem: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginTop: 8, backgroundColor: '#fff' },

  smallBtn: { backgroundColor: '#111', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  ok: { backgroundColor: '#2e7d32' },
  muted: { backgroundColor: '#9e9e9e' },
  productName: { fontWeight: '700', fontSize: 16, marginBottom: 4 },
  infoText: { color: '#555', fontSize: 14, marginBottom: 2 },
});
