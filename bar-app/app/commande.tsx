// app/commande.tsx
import { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, Pressable, StyleSheet,
  ActivityIndicator, Alert, FlatList, Platform
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../firebase';
import {
  runTransaction, doc, collection, serverTimestamp,
  getDocs, orderBy, query, writeBatch
} from 'firebase/firestore';
import { useAuth } from './context/AuthContext';

// ---------- Types ----------
type Produit = { id: string; name: string; price: number; category?: string; actif?: boolean };
type PanierItem = { id: string; name: string; price: number; qty: number };

// ---------- Helpers Firestore (sans Functions) ----------
async function openOrGetCommande(tableNum: string) {
  const tableRef = doc(db, 'tables', tableNum);

  return await runTransaction(db, async (tx) => {
    const tableSnap = await tx.get(tableRef);
    let openId = tableSnap.exists() ? (tableSnap.data() as any).openCommandeId : null;

    // S'il y a déjà une commande ouverte référencée -> on la renvoie
    if (openId) {
      const existingRef = doc(db, 'commandes', openId);
      const existingSnap = await tx.get(existingRef);
      if (existingSnap.exists() && existingSnap.data().finie === false) {
        return { id: existingRef.id, ...existingSnap.data() };
      }
      // Incohérence (commande finie/supprimée) -> on recrée proprement
      openId = null;
    }

    // Créer la commande **dans la transaction** et l’attacher à la table
    if (!openId) {
      const newCmdRef = doc(collection(db, 'commandes')); // ID auto
      tx.set(newCmdRef, {
        table: String(tableNum),
        finie: false,
        createdAt: serverTimestamp(),
        source: 'client_qr',
      });
      // crée/merge le doc table si absent + attache openCommandeId
      tx.set(tableRef, { openCommandeId: newCmdRef.id }, { merge: true });

      return { id: newCmdRef.id, table: String(tableNum), finie: false };
    }

    throw new Error("Impossible d'ouvrir la commande");
  });
}

async function closeCommande(tableNum: string, commandeId: string) {
  await runTransaction(db, async (tx) => {
    const tableRef = doc(db, 'tables', tableNum);
    const cmdRef = doc(db, 'commandes', commandeId);

    const cmdSnap = await tx.get(cmdRef);
    if (!cmdSnap.exists()) throw new Error('Commande introuvable');
    if (cmdSnap.data().finie === true) return;

    tx.update(cmdRef, { finie: true, closedAt: serverTimestamp() });

    const tableSnap = await tx.get(tableRef);
    if (tableSnap.exists() && (tableSnap.data() as any).openCommandeId === commandeId) {
      tx.update(tableRef, { openCommandeId: null });
    }
  });
}

// ---------- Composant principal ----------
export default function Commande() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth(); // peut être null pour client public

  const [tableNumber, setTableNumber] = useState<string>('');
  const [commandeId, setCommandeId] = useState<string>('');
  const [commandeFinie, setCommandeFinie] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState<Produit[]>([]);

  // Étape 1/2 : choix de la catégorie, puis produits
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Panier
  const [panier, setPanier] = useState<Record<string, PanierItem>>({});
  const total = useMemo(
    () => Object.values(panier).reduce((s, it) => s + it.price * it.qty, 0),
    [panier]
  );

  // 1) Lire ?table=XX
  useEffect(() => {
    const t = Array.isArray(params.table) ? params.table[0] : params.table;
    if (t && /^\d{1,4}$/.test(String(t))) {
      setTableNumber(String(t));
    }
  }, [params.table]);

  // 2) Charger produits
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'produits'), orderBy('name'));
        const snap = await getDocs(q);
        const list: Produit[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setProduits(list.filter((p) => p.actif !== false));
      } catch {
        Alert.alert('Erreur', "Impossible de charger les produits");
      }
    })();
  }, []);

  // 3) Ouverture ou récupération d'une commande ouverte (transaction)
  useEffect(() => {
    if (!tableNumber) return;
    setLoading(true);
    (async () => {
      try {
        const opened = await openOrGetCommande(tableNumber);
        setCommandeId(opened.id);
        setCommandeFinie(Boolean((opened as any).finie));
      } catch (e: any) {
        Alert.alert('Erreur', e?.message ?? "Ouverture de la commande impossible");
      } finally {
        setLoading(false);
      }
    })();
  }, [tableNumber]);

  // ---------- Panier ----------
  const addToCart = (p: Produit) => {
    if (commandeFinie) {
      Alert.alert('Commande close', 'Cette commande est terminée.');
      return;
    }
    setPanier((prev) => {
      const ex = prev[p.id];
      const qty = (ex?.qty ?? 0) + 1;
      return { ...prev, [p.id]: { id: p.id, name: p.name, price: p.price, qty } };
    });
  };
  const removeOne = (id: string) => {
    setPanier((prev) => {
      const ex = prev[id];
      if (!ex) return prev;
      const qty = ex.qty - 1;
      const clone: Record<string, PanierItem> = { ...prev };
      if (qty <= 0) delete clone[id]; else clone[id] = { ...ex, qty };
      return clone;
    });
  };
  const clearCart = () => setPanier({});

  // ---------- Envoi de la commande (écrit les lignes) ----------
  const submit = async () => {
    if (!tableNumber || !commandeId) {
      Alert.alert('Erreur', 'Commande non initialisée.');
      return;
    }
    if (commandeFinie) {
      Alert.alert('Commande close', 'Impossible d’ajouter: commande terminée.');
      return;
    }
    const items = Object.values(panier);
    if (items.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez au moins un produit.');
      return;
    }
    try {
      const batch = writeBatch(db);
      items.forEach((i) => {
        const ref = doc(collection(db, 'commandes', commandeId, 'lignes'));
        batch.set(ref, { produitId: i.id, name: i.name, price: i.price, qty: i.qty, addedAt: serverTimestamp() });
      });
      await batch.commit();
      Alert.alert('Commande envoyée', `${items.length} produit(s) ajoutés`);
      clearCart();
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? "Impossible d'envoyer la commande");
    }
  };

  // ---------- Clôture (staff uniquement) ----------
  const isStaff = Boolean(user?.role === 'admin' || user?.role === 'serveur');
  const onClose = async () => {
    if (!isStaff) return;
    try {
      await closeCommande(tableNumber, commandeId);
      setCommandeFinie(true);
      Alert.alert('Commande terminée', `La table ${tableNumber} est libérée.`);
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Clôture impossible');
    }
  };

  // ---------- Catégories ----------
  const categories = useMemo(() => {
    const set = new Set<string>();
    produits.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [produits]);

  const produitsDeCategorie = useMemo(() => {
    if (!selectedCategory) return [] as Produit[];
    const base = produits.filter((p) => p.category === selectedCategory);
    return search ? base.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())) : base;
  }, [produits, selectedCategory, search]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Table {tableNumber}</Text>
      <Text style={[styles.badge, commandeFinie ? styles.badgeClosed : styles.badgeOpen]}>
        {commandeFinie ? 'Commande terminée' : 'Commande ouverte'}
      </Text>

      {/* === ÉTAPE 1: CHOISIR UNE CATÉGORIE === */}
      {!selectedCategory && (
        <>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Choisis une catégorie</Text>
          {categories.length === 0 ? (
            <Text style={{ color: '#666' }}>Aucune catégorie disponible.</Text>
          ) : (
            <FlatList
              data={categories}
              keyExtractor={(k) => k}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ gap: 10, paddingBottom: 12 }}
              renderItem={({ item }) => (
                <Pressable onPress={() => setSelectedCategory(item)} style={styles.catTile}>
                  <Text style={styles.catTileTitle}>{item}</Text>
                </Pressable>
              )}
            />
          )}
        </>
      )}

      {/* === ÉTAPE 2: LISTE DES PRODUITS DE LA CATÉGORIE === */}
      {selectedCategory && (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Pressable onPress={() => setSelectedCategory(null)} style={styles.backChip}>
              <Text style={{ color: '#111' }}>← Catégories</Text>
            </Pressable>
            <Text style={[styles.title, { marginLeft: 8, marginBottom: 0 }]}>{selectedCategory}</Text>
          </View>

          {/* Recherche (facultatif) */}
          <TextInput
            placeholder="Rechercher un produit…"
            value={search}
            onChangeText={setSearch}
            style={[styles.input, { marginBottom: 10 }]}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <FlatList
            data={produitsDeCategorie}
            keyExtractor={(p) => p.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pName}>{item.name}</Text>
                  <Text style={styles.pPrice}>{item.price.toFixed(2)} CHF</Text>
                </View>
                <Pressable
                  disabled={commandeFinie}
                  onPress={() => addToCart(item)}
                  style={[styles.addBtn, commandeFinie && { opacity: 0.5 }]}
                >
                  <Text style={styles.addBtnText}>Ajouter</Text>
                </Pressable>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 140 }}
          />
        </>
      )}

      {/* Panier */}
      <View style={styles.cartBar}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cartTitle}>Panier</Text>
          {Object.values(panier).length === 0 ? (
            <Text style={styles.cartEmpty}>Aucun produit</Text>
          ) : (
            <View style={{ maxHeight: 160 }}>
              <FlatList
                data={Object.values(panier)}
                keyExtractor={(i) => i.id}
                renderItem={({ item }) => (
                  <View style={styles.cartItem}>
                    <Text style={{ flex: 1 }}>{item.name}</Text>
                    <Text style={{ width: 60, textAlign: 'right' }}>x{item.qty}</Text>
                    <Text style={{ width: 90, textAlign: 'right' }}>{(item.price * item.qty).toFixed(2)} CHF</Text>
                    <Pressable onPress={() => removeOne(item.id)} style={styles.removeBtn}>
                      <Text style={{ color: '#fff' }}>−</Text>
                    </Pressable>
                  </View>
                )}
              />
            </View>
          )}
        </View>

        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.total}>Total: {total.toFixed(2)} CHF</Text>

          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Pressable disabled={commandeFinie} onPress={clearCart} style={[styles.actionBtn, styles.clearBtn, commandeFinie && { opacity: 0.5 }]}>
              <Text style={styles.actionBtnText}>Vider</Text>
            </Pressable>
            <Pressable disabled={commandeFinie} onPress={submit} style={[styles.actionBtn, styles.submitBtn, commandeFinie && { opacity: 0.5 }]}>
              <Text style={styles.actionBtnText}>Envoyer</Text>
            </Pressable>
          </View>

          {(user?.role === 'admin' || user?.role === 'serveur') && (
            <Pressable onPress={onClose} style={[styles.actionBtn, styles.closeBtn, { marginTop: 8 }]}>
              <Text style={styles.actionBtnText}>Terminer la commande</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Conseils iOS web quand pas de scan intégré */}
      {Platform.OS === 'web' && (
        <Text style={{ color: '#888', fontSize: 12, textAlign: 'center', marginTop: 6 }}>
          Astuce: ouvrez cette page via l’appareil photo (QR) pour pré-remplir la table.
        </Text>
      )}
    </View>
  );
}

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 10, color: '#fff' },
  badgeOpen: { backgroundColor: '#2e7d32' },
  badgeClosed: { backgroundColor: '#9e9e9e' },

  // Étape Catégories
  catTile: {
    flex: 1,
    minHeight: 90,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#fafafa',
    justifyContent: 'center',
  },
  catTileTitle: { fontSize: 16, fontWeight: '800' },
  backChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },

  // Produits
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginBottom: 10 },
  pName: { fontWeight: '700' },
  pPrice: { color: '#444', marginTop: 4 },
  addBtn: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },

  // Panier
  cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa', padding: 12 },
  cartTitle: { fontWeight: '700', marginBottom: 6 },
  cartEmpty: { color: '#666' },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  removeBtn: { backgroundColor: '#e53935', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  total: { fontWeight: '800', fontSize: 16 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  clearBtn: { backgroundColor: '#9E9E9E' },
  submitBtn: { backgroundColor: '#111' },
  closeBtn: { backgroundColor: '#d32f2f' },
  actionBtnText: { color: '#fff', fontWeight: '700' },

  // Ajout du style input
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#fff',
    fontSize: 16,
  },
});
