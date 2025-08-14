// app/produits/[category].tsx
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, TextInput, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../../firebase';
import {
  doc, getDoc, collection, query, where, getDocs, serverTimestamp, writeBatch
} from 'firebase/firestore';

type Produit = { id: string; name: string; price: number; actif?: boolean };

export default function ProduitsByCategory() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const categoryId = Array.isArray(params.category) ? params.category[0] : (params.category as string);
  const table = Array.isArray(params.table) ? params.table[0] : (params.table as string);
  const cmd = Array.isArray(params.cmd) ? params.cmd[0] : (params.cmd as string);
  const categoryName = Array.isArray(params.cname) ? params.cname[0] : (params.cname as string | undefined);

  const [commandeFinie, setCommandeFinie] = useState<boolean>(false);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [search, setSearch] = useState('');

  // Vérifier si la commande est finie
  useEffect(() => {
    (async () => {
      try {
        if (!cmd) throw new Error('Commande manquante');
        const snap = await getDoc(doc(db, 'commandes', cmd));
        if (!snap.exists()) throw new Error('Commande introuvable');
        setCommandeFinie(Boolean(snap.data().finie));
      } catch (e: any) {
        Alert.alert('Erreur', e?.message ?? "Impossible de lire la commande");
      }
    })();
  }, [cmd]);

  // Charger produits de la catégorie (filtre par référence, SANS orderBy)
  useEffect(() => {
    (async () => {
      try {
        const categoryRef = doc(db, 'categories', categoryId);
        const q = query(
          collection(db, 'produits'),
          where('categorie', '==', categoryRef)
        );
        const snap = await getDocs(q);
        const list: Produit[] = snap.docs.map(d => {
          const x = d.data() as any;
          return {
            id: d.id,
            name: x.nom,
            price: Number(x.prix),
            actif: x.disponible !== false,
          };
        })
        // tri côté client par nom
        .sort((a, b) => a.name.localeCompare(b.name));
        setProduits(list.filter(p => p.actif !== false));
      } catch (e: any) {
        Alert.alert('Erreur', e?.message ?? "Impossible de charger les produits");
      }
    })();
  }, [categoryId]);

  const filtered = useMemo(
    () => (search ? produits.filter(p => p.name.toLowerCase().includes(search.toLowerCase())) : produits),
    [produits, search]
  );

  const addOne = async (p: Produit) => {
    if (commandeFinie) {
      Alert.alert('Commande close', 'Cette commande est terminée.');
      return;
    }
    try {
      const batch = writeBatch(db);
      const ref = doc(collection(db, 'commandes', cmd, 'lignes'));
      batch.set(ref, {
        produitId: p.id,
        name: p.name,
        price: p.price,
        qty: 1,
        addedAt: serverTimestamp(),
      });
      await batch.commit();
      Alert.alert('Ajouté', `${p.name} ajouté à la commande.`);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? "Impossible d'ajouter le produit");
    }
  };

  return (
    <View style={styles.container}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Pressable onPress={() => router.back()} style={styles.backChip}>
          <Text style={{ color: '#111' }}>← Table {table}</Text>
        </Pressable>
        <Text style={[styles.title, { marginLeft: 8, marginBottom: 0 }]}>{categoryName || categoryId}</Text>
      </View>

      <TextInput
        placeholder="Rechercher un produit…"
        value={search}
        onChangeText={setSearch}
        style={[styles.input, { marginBottom: 10 }]}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pName}>{item.name}</Text>
              <Text style={styles.pPrice}>{item.price.toFixed(2)} CHF</Text>
            </View>
            <Pressable
              disabled={commandeFinie}
              onPress={() => addOne(item)}
              style={[styles.addBtn, commandeFinie && { opacity: 0.5 }]}
            >
              <Text style={styles.addBtnText}>Ajouter</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Aucun produit.</Text>}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      <Text style={[styles.badge, commandeFinie ? styles.badgeClosed : styles.badgeOpen]}>
        {commandeFinie ? 'Commande terminée' : 'Commande ouverte'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12 },
  backChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginBottom: 10 },
  pName: { fontWeight: '700' },
  pPrice: { color: '#444', marginTop: 4 },
  addBtn: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginTop: 10, color: '#fff' },
  badgeOpen: { backgroundColor: '#2e7d32' },
  badgeClosed: { backgroundColor: '#9e9e9e' },
});
