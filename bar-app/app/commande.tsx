// app/commande.tsx
import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, FlatList } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../firebase';
import {
  runTransaction, doc, collection, serverTimestamp, getDocs, query, orderBy
} from 'firebase/firestore';
import { useAuth } from './context/AuthContext';

type Produit = { id: string; name: string; price: number; category?: string; actif?: boolean };

async function openOrGetCommande(tableNum: string) {
  const tableRef = doc(db, 'tables', tableNum);

  return await runTransaction(db, async (tx) => {
    const tableSnap = await tx.get(tableRef);
    let openId = tableSnap.exists() ? (tableSnap.data() as any).openCommandeId : null;

    if (openId) {
      const existingRef = doc(db, 'commandes', openId);
      const existingSnap = await tx.get(existingRef);
      if (existingSnap.exists() && existingSnap.data().finie === false) {
        return { id: existingRef.id, ...existingSnap.data() };
      }
      // Lien cassé ou commande finie -> recréation propre
      openId = null;
    }

    // Créer la commande et lier à la table **dans la même transaction**
    if (!openId) {
      const newCmdRef = doc(collection(db, 'commandes'));
      tx.set(newCmdRef, {
        table: String(tableNum),
        finie: false,
        createdAt: serverTimestamp(),
        source: 'client_qr',
      });
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

export default function CommandeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user } = useAuth();

  const [tableNumber, setTableNumber] = useState<string>('');
  const [commandeId, setCommandeId] = useState<string>('');
  const [commandeFinie, setCommandeFinie] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState<Produit[]>([]);

  const isStaff = user?.role === 'admin' || user?.role === 'serveur';

  // Lire ?table=XX
  useEffect(() => {
    const t = Array.isArray(params.table) ? params.table[0] : params.table;
    if (t && /^\d{1,4}$/.test(String(t))) {
      setTableNumber(String(t));
    }
  }, [params.table]);

  // Charger produits (pour extraire les catégories)
  useEffect(() => {
    (async () => {
      try {
        const q = query(collection(db, 'produits'), orderBy('nom'));
        const snap = await getDocs(q);
        console.log('Produits chargés:', snap.docs.length);
        const list: Produit[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setProduits(list.filter((p) => p.actif !== false));
      } catch {
        Alert.alert('Erreur', "Impossible de charger les produits");
      }
    })();
  }, []);

  // Ouvrir / récupérer la commande unique
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

  const categories = useMemo(() => {
    const set = new Set<string>();
    produits.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [produits]);

  const goCategory = (cat: string) => {
    if (!tableNumber || !commandeId) {
      Alert.alert('Erreur', 'Commande non initialisée.');
      return;
    }
    router.push({
      pathname: `/produits/${encodeURIComponent(cat)}`,
      params: { table: tableNumber, cmd: commandeId },
    });
  };

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

      <Text style={{ fontWeight: '700', marginBottom: 8 }}>Choisis une catégorie</Text>
      <FlatList
        data={categories}
        keyExtractor={(k) => k}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => goCategory(item)}
            disabled={commandeFinie}
            style={[styles.catTile, commandeFinie && { opacity: 0.6 }]}
          >
            <Text style={styles.catTileTitle}>{item}</Text>
          </Pressable>
        )}
        ListEmptyComponent={<Text style={{ color: '#666' }}>Aucune catégorie disponible.</Text>}
      />

      {isStaff && (
        <Pressable onPress={onClose} style={[styles.actionBtn, styles.closeBtn, { marginTop: 16 }]}>
          <Text style={styles.actionBtnText}>Fermer la commande</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 10, color: '#fff' },
  badgeOpen: { backgroundColor: '#2e7d32' },
  badgeClosed: { backgroundColor: '#9e9e9e' },
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
  actionBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8 },
  closeBtn: { backgroundColor: '#d32f2f' },
  actionBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
});
