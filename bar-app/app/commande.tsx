// app/commande.tsx
import { useEffect, useState, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, FlatList, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db } from '../firebase';
import {
  runTransaction, doc, collection, serverTimestamp,
  getDocs, query, orderBy
} from 'firebase/firestore';
import { useAuth } from './context/AuthContext';

type Categorie = { id: string; name: string };

// ---------- Firestore helpers ----------
async function openOrGetCommande(tableNum: string) {
  const tableRef = doc(db, 'tables', tableNum);

  return await runTransaction(db, async (tx) => {
    const tableSnap = await tx.get(tableRef);
    let openId = tableSnap.exists() ? (tableSnap.data() as any).openCommandeId : null;

    if (openId) {
      const cmdRef = doc(db, 'commandes', openId);
      const cmdSnap = await tx.get(cmdRef);
      if (cmdSnap.exists() && cmdSnap.data().finie === false) {
        return { id: cmdRef.id, ...cmdSnap.data() };
      }
      // référence cassée → on recrée
      openId = null;
    }

    // Créer la commande **dans** la transaction et lier à la table
    const newCmdRef = doc(collection(db, 'commandes'));
    tx.set(newCmdRef, {
      table: String(tableNum),
      finie: false,
      createdAt: serverTimestamp(),
      source: 'client_qr',
    });
    tx.set(tableRef, { openCommandeId: newCmdRef.id }, { merge: true });
    return { id: newCmdRef.id, table: String(tableNum), finie: false };
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

// ---------- Screen ----------
export default function CommandeScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [tableNumber, setTableNumber] = useState<string>('');
  const [commandeId, setCommandeId] = useState<string>('');
  const [commandeFinie, setCommandeFinie] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<Categorie[]>([]);

  const isStaff = user?.role === 'admin' || user?.role === 'serveur';

  // Lire ?table=XX
  useEffect(() => {
    const t = Array.isArray(params.table) ? params.table[0] : params.table;
    if (t && /^\d{1,4}$/.test(String(t))) setTableNumber(String(t));
  }, [params.table]);

  // Charger liste des catégories
  useEffect(() => {
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, 'categories'), orderBy('nom')));
        setCategories(snap.docs.map(d => ({ id: d.id, name: (d.data() as any).nom || d.id })));
      } catch {
        Alert.alert('Erreur', "Impossible de charger les catégories");
      }
    })();
  }, []);

  // Ouvrir / récupérer l’unique commande ouverte
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

  const goCategory = (cat: Categorie) => {
    if (!tableNumber || !commandeId) {
      Alert.alert('Erreur', 'Commande non initialisée.');
      return;
    }
    router.push({
      pathname: `/produits/${encodeURIComponent(cat.id)}`,
      params: { table: tableNumber, cmd: commandeId, cname: cat.name },
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
    return <View style={styles.center}><ActivityIndicator /></View>;
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
        keyExtractor={(c) => c.id}
        numColumns={2}
        columnWrapperStyle={{ gap: 10 }}
        contentContainerStyle={{ gap: 10 }}
        renderItem={({ item }) => (
          <Pressable
            onPress={() => goCategory(item)}
            disabled={commandeFinie}
            style={[styles.catTile, commandeFinie && { opacity: 0.6 }]}
          >
            <Text style={styles.catTileTitle}>{item.name}</Text>
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

// ---------- Styles ----------
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, marginBottom: 10, color: '#fff' },
  badgeOpen: { backgroundColor: '#2e7d32' },
  badgeClosed: { backgroundColor: '#9e9e9e' },
  catTile: {
    flex: 1, minHeight: 90, borderWidth: 1, borderColor: '#eee',
    borderRadius: 12, padding: 12, backgroundColor: '#fafafa', justifyContent: 'center',
  },
  catTileTitle: { fontSize: 16, fontWeight: '800' },
  actionBtn: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: 8 },
  closeBtn: { backgroundColor: '#d32f2f' },
  actionBtnText: { color: '#fff', fontWeight: '700', textAlign: 'center' },
});
