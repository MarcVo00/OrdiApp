// app/cuisine.tsx
import { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { collection, doc, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProtectedRoute from './components/protectedRoute';
import NavBar from './components/NavBar';

type Commande = {
  id: string;
  table: string;
  finie: boolean;
  createdAt?: any;
};

type Ligne = {
  id: string;
  produitId: string;
  name: string;
  price: number;
  qty: number;
  status?: 'pending' | 'preparing' | 'ready' | 'served';
  addedAt?: any;
};

type CommandeWithLines = Commande & { lignes: Ligne[] };

export default function CuisineScreen() {
  const [cmds, setCmds] = useState<CommandeWithLines[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');

  // Abonnement temps réel aux commandes ouvertes + leurs lignes
  useEffect(() => {
    const qCmd = query(collection(db, 'commandes'), orderBy('createdAt', 'desc'));
    const unsubCmd = onSnapshot(qCmd, (snap) => {
      const open = snap.docs
        .map((d) => ({ id: d.id, ...(d.data() as any) }))
        .filter((c) => c.finie === false) as Commande[];

      // pour chaque commande, on ouvre un listener sur ses lignes
      const unsubs: (() => void)[] = [];
      const temp: Record<string, CommandeWithLines> = {};
      open.forEach((c) => {
        temp[c.id] = { ...c, lignes: [] };
        const qLines = query(
          collection(db, 'commandes', c.id, 'lignes'),
          orderBy('addedAt', 'asc')
        );
        const u = onSnapshot(qLines, (ls) => {
          temp[c.id].lignes = ls.docs.map((d) => ({ id: d.id, ...(d.data() as any) } as Ligne));
          // push snapshot sur l'état global (on reconstruit la liste pour forcer un render)
          setCmds(Object.values(temp).sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0)));
        });
        unsubs.push(u);
      });

      // initial set (au cas où aucune ligne n’arrive tout de suite)
      setCmds(Object.values(temp));

      // cleanup quand la liste des commandes change
      return () => unsubs.forEach((u) => u());
    });

    return () => unsubCmd();
  }, []);

  const filtered = useMemo(() => {
    if (filter === 'all') return cmds;
    return cmds.map((c) => ({
      ...c,
      lignes: c.lignes.filter((l) => (l.status ?? 'pending') === filter),
    }));
  }, [cmds, filter]);

  // Actions de statut par ligne
  const setStatus = async (commandeId: string, ligneId: string, status: Ligne['status']) => {
    try {
      await updateDoc(doc(db, 'commandes', commandeId, 'lignes', ligneId), {
        status,
      });
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? 'Impossible de changer le statut');
    }
  };

  // Rendu d’une commande + ses lignes
  const renderCommande = ({ item }: { item: CommandeWithLines }) => {
    const lines = item.lignes;
    const counts = {
      total: lines.length,
      pending: lines.filter((l) => (l.status ?? 'pending') === 'pending').length,
      preparing: lines.filter((l) => l.status === 'preparing').length,
      ready: lines.filter((l) => l.status === 'ready').length,
      served: lines.filter((l) => l.status === 'served').length,
    };

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.cardTitle}>Table {item.table}</Text>
          <Text style={styles.badge}>Ouverte</Text>
        </View>
        <Text style={styles.muted}>
          {counts.total} article(s) — ⏳ {counts.pending} • 🔧 {counts.preparing} • ✅ {counts.ready} • 🍽️ {counts.served}
        </Text>

        <FlatList
          data={lines}
          keyExtractor={(l) => l.id}
          renderItem={({ item: l }) => (
            <View style={styles.lineRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.lineTitle}>
                  {l.name} <Text style={styles.muted}>×{l.qty}</Text>
                </Text>
                <Text style={styles.mutedSmall}>
                  {(l.price * l.qty).toFixed(2)} CHF • statut : {l.status ?? 'pending'}
                </Text>
              </View>

              <View style={styles.actionsRow}>
                <Pressable onPress={() => setStatus(item.id, l.id, 'preparing')} style={[styles.smallBtn, styles.btnWarn]}>
                  <Text style={styles.smallBtnText}>En cours</Text>
                </Pressable>
                <Pressable onPress={() => setStatus(item.id, l.id, 'ready')} style={[styles.smallBtn, styles.btnOk]}>
                  <Text style={styles.smallBtnText}>Prêt</Text>
                </Pressable>
                <Pressable onPress={() => setStatus(item.id, l.id, 'served')} style={[styles.smallBtn, styles.btnMuted]}>
                  <Text style={styles.smallBtnText}>Servi</Text>
                </Pressable>
              </View>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.muted}>Aucune ligne.</Text>}
          contentContainerStyle={{ gap: 8 }}
        />
      </View>
    );
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'serveur', 'cuisine']}>
      <View style={styles.container}>
        <Text style={styles.title}>Cuisine / Bar</Text>

        {/* Filtres */}
        <View style={styles.filters}>
          {(['all', 'pending', 'preparing', 'ready'] as const).map((f) => (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, filter === f && styles.filterChipActive]}
            >
              <Text style={filter === f ? styles.filterTextActive : styles.filterText}>
                {{
                  all: 'Toutes',
                  pending: 'En attente',
                  preparing: 'En cours',
                  ready: 'Prêtes',
                }[f]}
              </Text>
            </Pressable>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(c) => c.id}
          renderItem={renderCommande}
          contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
          ListEmptyComponent={<Text style={styles.muted}>Pas de commandes ouvertes.</Text>}
        />
      </View>
      <NavBar />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 10 },

  filters: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
  filterChip: { borderWidth: 1, borderColor: '#ddd', borderRadius: 999, paddingVertical: 6, paddingHorizontal: 10 },
  filterChipActive: { backgroundColor: '#111', borderColor: '#111' },
  filterText: { color: '#111', fontWeight: '700' },
  filterTextActive: { color: '#fff', fontWeight: '700' },

  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 12, padding: 12, backgroundColor: '#fafafa' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  badge: { backgroundColor: '#2e7d32', color: '#fff', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, overflow: 'hidden' },
  muted: { color: '#666', marginTop: 4 },
  mutedSmall: { color: '#777', fontSize: 12 },

  lineRow: { borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 10, backgroundColor: '#fff' },
  lineTitle: { fontWeight: '700' },

  actionsRow: { flexDirection: 'row', gap: 6, marginTop: 6, flexWrap: 'wrap' },
  smallBtn: { borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 },
  smallBtnText: { color: '#fff', fontWeight: '700' },
  btnOk: { backgroundColor: '#2e7d32' },
  btnWarn: { backgroundColor: '#ef6c00' },
  btnMuted: { backgroundColor: '#9e9e9e' },
});
