import { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, FlatList, StyleSheet, ActivityIndicator, Modal, Alert, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from './context/AuthContext';
import { BarCodeScanner } from 'expo-barcode-scanner';

/**
 * ❗️Spécifications demandées
 * - Le CLIENT n'a PAS besoin de compte.
 * - Le QR code amène sur /commande?table=12&t=<token>. Le token correspond à une "session de table" côté Firestore.
 * - Cette session a une validité (expiration) et ne doit pas être réutilisable à l'infini.
 * - Le SERVEUR (connecté avec rôle) saisit un numéro de table sur une page serveur et est redirigé vers /commande?table=XX (pas besoin de token côté serveur/admin).
 *
 * 🔒 Modèle Firestore proposé (collection `table_sessions`):
 *   - id: token (string aléatoire)
 *   - table: string | number
 *   - expiresAt: Timestamp
 *   - consumed: boolean (par défaut false) OU orderCount: number
 *   - maxOrders: number (par défaut 1)
 *
 *  Règle côté UI ici:
 *   - Si l'utilisateur N'EST PAS connecté (client public):
 *       -> exiger ?t=<token> valide ET non expiré ET non consommé (si maxOrders=1)
 *       -> après envoi de commande, marquer la session "consumed: true" (ou incrémenter orderCount)
 *   - Si l'utilisateur EST connecté (serveur/admin):
 *       -> autoriser sans token (source = interne_role)
 */

// ──────────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────────

type Produit = {
  id: string;
  name: string;
  price: number;
  category?: string;
  actif?: boolean;
};

type PanierItem = {
  id: string;
  name: string;
  price: number;
  qty: number;
};

type TableSession = {
  table: string;
  expiresAt: any; // Firestore Timestamp
  consumed?: boolean;
  maxOrders?: number; // défaut 1
  orderCount?: number; // défaut 0
};

// ──────────────────────────────────────────────────────────────────────────────
// Page Commande
// ──────────────────────────────────────────────────────────────────────────────

export default function Commande() {
  const router = useRouter();
  const { user } = useAuth(); // null pour client public
  const params = useLocalSearchParams();

  // Table & Token (depuis URL ou QR)
  const [tableNumber, setTableNumber] = useState<string>('');
  const [token, setToken] = useState<string>('');
  const [session, setSession] = useState<TableSession | null>(null);
  const [sessionStatus, setSessionStatus] = useState<'checking' | 'ok' | 'missing' | 'expired' | 'consumed' | 'invalid' | 'not-required'>('checking');

  // Produits
  const [loading, setLoading] = useState(true);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [category, setCategory] = useState<string>('Toutes');

  // Panier
  const [panier, setPanier] = useState<Record<string, PanierItem>>({});
  const total = useMemo(() => Object.values(panier).reduce((s, it) => s + it.price * it.qty, 0), [panier]);

  // Scanner QR (option natif)
  const [scannerOpen, setScannerOpen] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const scanningRef = useRef(false);

  // 1) Lire paramètres d'URL (?table=XX&t=TOKEN)
  useEffect(() => {
    const t = Array.isArray(params.table) ? params.table[0] : params.table;
    const tok = Array.isArray(params.t) ? params.t[0] : params.t;
    if (t && /^\d{1,4}$/.test(String(t))) setTableNumber(String(t));
    if (tok && typeof tok === 'string') setToken(tok);
  }, [params.table, params.t]);

  // 2) Charger produits
  useEffect(() => {
    const load = async () => {
      try {
        const col = collection(db, 'produits');
        const q = query(col, orderBy('name'));
        const snap = await getDocs(q);
        const list: Produit[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        setProduits(list.filter((p) => p.actif !== false));
      } catch (e) {
        Alert.alert('Erreur', "Impossible de charger les produits");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // 3) Vérifier/charger la session si nécessaire
  useEffect(() => {
    const isStaff = !!user?.role; // admin/serveur/cuisine
    // Si staff connecté → pas de token requis
    if (isStaff) {
      setSessionStatus('not-required');
      setSession(null);
      return;
    }

    // Client public → token obligatoire
    if (!token) {
      setSessionStatus('missing');
      return;
    }

    const check = async () => {
      try {
        const ref = doc(db, 'table_sessions', token);
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          setSessionStatus('invalid');
          return;
        }
        const data = snap.data() as TableSession;
        setSession(data);

        // table du token doit correspondre à l'URL (si fournie)
        if (tableNumber && String(data.table) !== String(tableNumber)) {
          // on force la table issue du token
          setTableNumber(String(data.table));
        }

        const exp = data.expiresAt?.toDate?.() ?? null;
        const now = new Date();
        const isExpired = !exp || exp.getTime() < now.getTime();
        const maxOrders = data.maxOrders ?? 1;
        const count = data.orderCount ?? (data.consumed ? 1 : 0);
        const isConsumed = count >= maxOrders;

        if (isExpired) setSessionStatus('expired');
        else if (isConsumed) setSessionStatus('consumed');
        else setSessionStatus('ok');
      } catch (e) {
        setSessionStatus('invalid');
      }
    };
    check();
  }, [token, user, tableNumber]);

  // Catégories à partir des produits
  const categories = useMemo(() => {
    const set = new Set<string>(['Toutes']);
    produits.forEach((p) => p.category && set.add(p.category));
    return Array.from(set);
  }, [produits]);

  const produitsAffiches = useMemo(() => {
    return category === 'Toutes' ? produits : produits.filter((p) => p.category === category);
  }, [produits, category]);

  // Panier helpers
  const addToCart = (p: Produit) => {
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
      const clone = { ...prev };
      if (qty <= 0) delete clone[id]; else clone[id] = { ...ex, qty };
      return clone;
    });
  };

  const clearCart = () => setPanier({});

  // 4) Soumettre la commande
  const submit = async () => {
    const t = parseInt(tableNumber, 10);
    if (!Number.isInteger(t) || t <= 0) {
      Alert.alert('Table manquante', 'Choisissez un numéro de table (ou scannez le QR).');
      return;
    }
    const items = Object.values(panier);
    if (items.length === 0) {
      Alert.alert('Panier vide', 'Ajoutez au moins un produit.');
      return;
    }

    // Vérifier droit: client public nécessite session ok; staff bypass
    const isStaff = !!user?.role;
    if (!isStaff) {
      if (sessionStatus === 'checking') return; // attendre
      if (sessionStatus !== 'ok') {
        const reason =
          sessionStatus === 'missing' ? 'Lien invalide: token manquant.' :
          sessionStatus === 'expired' ? 'Votre lien a expiré.' :
          sessionStatus === 'consumed' ? 'Ce lien a déjà été utilisé.' :
          'Lien invalide.';
        Alert.alert('Impossible de commander', reason);
        return;
      }
    }

    try {
      // 1) Créer la commande
      const orderRef = await addDoc(collection(db, 'commandes'), {
        table: String(t),
        produits: items.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
        statut: 'en_attente',
        createdAt: serverTimestamp(),
        source: isStaff ? `interne_${user?.role}` : 'client_qr',
        createdBy: user?.uid ?? null,
        token: !isStaff ? token : null,
      });

      // 2) Marquer la session comme consommée (client public)
      if (!isStaff && token) {
        const ref = doc(db, 'table_sessions', token);
        const snapshot = await getDoc(ref);
        if (snapshot.exists()) {
          const data = snapshot.data() as TableSession;
          const maxOrders = data.maxOrders ?? 1;
          const count = (data.orderCount ?? 0) + 1;
          const consumed = count >= maxOrders;
          await updateDoc(ref, { orderCount: count, consumed, lastOrderAt: serverTimestamp(), lastOrderId: orderRef.id });
        }
      }

      Alert.alert('Commande envoyée', `Table ${t} — ${items.length} produit(s)`);
      clearCart();

      // Client public: on reste; Staff: optionnel rediriger vers une page de suivi
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? "Impossible d'envoyer la commande");
    }
  };

  // ─── Scanner QR (option natif) ─────────────────────────────────────────────
  const openScanner = async () => {
    setScannerOpen(true);
    try {
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    } catch {
      setHasPermission(false);
    }
  };

  const handleBarCodeScanned = ({ data }: { data: string }) => {
    if (scanningRef.current) return; // ignore doublons
    scanningRef.current = true;

    let foundTable: string | null = null;
    let foundToken: string | null = null;

    try {
      // URL attendue: .../commande?table=12&t=abcdef
      const url = new URL(data);
      const qpT = url.searchParams.get('table');
      const qpTok = url.searchParams.get('t');
      if (qpT && /^\d{1,4}$/.test(qpT)) foundTable = qpT;
      if (qpTok) foundToken = qpTok;
    } catch {
      // Fallback patterns simples: "table:12;token:abc" ou juste un nombre pour la table
      const m1 = String(data).match(/table\s*[:=]\s*(\d{1,4})/i);
      const m2 = String(data).match(/token\s*[:=]\s*([A-Za-z0-9_-]{6,})/i);
      const m3 = String(data).match(/^(\d{1,4})$/);
      if (m1) foundTable = m1[1];
      if (m2) foundToken = m2[1];
      if (!foundTable && m3) foundTable = m3[1];
    }

    if (foundTable) setTableNumber(foundTable);
    if (foundToken) setToken(foundToken);

    setScannerOpen(false);
    scanningRef.current = false;
  };

  // ─── États d’accès pour clients publics ───────────────────────────────────
  const renderSessionBanner = () => {
    const isStaff = !!user?.role;
    if (isStaff) return null; // pas de bannière pour staff

    if (sessionStatus === 'checking') return (
      <View style={styles.bannerInfo}><Text style={styles.bannerText}>Vérification du lien…</Text></View>
    );
    if (sessionStatus === 'ok') return (
      <View style={styles.bannerOk}><Text style={styles.bannerText}>Lien valide pour la table {tableNumber}</Text></View>
    );
    if (sessionStatus === 'missing') return (
      <View style={styles.bannerError}><Text style={styles.bannerText}>Lien invalide (token manquant). Scannez le QR sur votre table.</Text></View>
    );
    if (sessionStatus === 'expired') return (
      <View style={styles.bannerError}><Text style={styles.bannerText}>Ce lien a expiré. Demandez un nouveau QR.</Text></View>
    );
    if (sessionStatus === 'consumed') return (
      <View style={styles.bannerError}><Text style={styles.bannerText}>Ce lien a déjà été utilisé.</Text></View>
    );
    if (sessionStatus === 'invalid') return (
      <View style={styles.bannerError}><Text style={styles.bannerText}>Lien non reconnu. Scannez le QR officiel de la table.</Text></View>
    );
    return null;
  };

  // ─── Chargement global produits ───────────────────────────────────────────
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nouvelle commande</Text>

      {renderSessionBanner()}

      {/* Sélection de table (staff: manuel / client: prérempli depuis QR) */}
      <View style={styles.tableRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>Numéro de table</Text>
          <TextInput
            placeholder="ex: 12"
            keyboardType="numeric"
            inputMode="numeric"
            value={tableNumber}
            onChangeText={setTableNumber}
            style={styles.input}
          />
          {token && !user?.role ? (
            <Text style={styles.hint}>Token présent</Text>
          ) : null}
        </View>
        <Pressable onPress={openScanner} style={styles.scanBtn}>
          <Text style={styles.scanBtnText}>📷 Scanner QR</Text>
        </Pressable>
      </View>

      {/* Filtres catégories */}
      <FlatList
        horizontal
        data={categories}
        keyExtractor={(c) => c}
        contentContainerStyle={{ paddingVertical: 6 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setCategory(item)} style={[styles.chip, category === item && styles.chipActive]}>
            <Text style={category === item ? styles.chipTextActive : styles.chipText}>{item}</Text>
          </Pressable>
        )}
        showsHorizontalScrollIndicator={false}
      />

      {/* Liste produits */}
      <FlatList
        data={produitsAffiches}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.pName}>{item.name}</Text>
              <Text style={styles.pPrice}>{item.price.toFixed(2)} CHF</Text>
            </View>
            <Pressable onPress={() => addToCart(item)} style={styles.addBtn}>
              <Text style={styles.addBtnText}>Ajouter</Text>
            </Pressable>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

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
            <Pressable onPress={clearCart} style={[styles.actionBtn, styles.clearBtn]}>
              <Text style={styles.actionBtnText}>Vider</Text>
            </Pressable>
            <Pressable onPress={submit} style={[styles.actionBtn, styles.submitBtn]}>
              <Text style={styles.actionBtnText}>Envoyer</Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Modal Scanner */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={{ flex: 1 }}>
          <View style={{ padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 18, fontWeight: '700' }}>Scanner un QR de table</Text>
            <Pressable onPress={() => setScannerOpen(false)}><Text>Fermer</Text></Pressable>
          </View>
          {hasPermission === false && (
            <View style={styles.center}><Text>Pas d&apos;accès caméra. Entrez le numéro manuellement.</Text></View>
          )}
          {hasPermission !== false && (
            <BarCodeScanner onBarCodeScanned={handleBarCodeScanned} style={{ flex: 1 }} />
          )}
          {Platform.OS === 'web' && (
            <Text style={{ textAlign: 'center', padding: 12, color: '#666' }}>
              Conseil: Sur iOS/Safari (web/PWA), mieux vaut un QR qui ouvre l&apos;URL avec « ?table=12&t=TOKEN ».
            </Text>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Styles
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 16 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  label: { fontWeight: '600', marginBottom: 4 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10 },
  tableRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-end', marginBottom: 12 },
  scanBtn: { backgroundColor: '#111', paddingVertical: 12, paddingHorizontal: 12, borderRadius: 10 },
  scanBtnText: { color: '#fff', fontWeight: '700' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1, borderColor: '#ddd', marginRight: 8 },
  chipActive: { backgroundColor: '#111', borderColor: '#111' },
  chipText: { color: '#111' },
  chipTextActive: { color: '#fff' },
  card: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12, marginBottom: 10 },
  pName: { fontWeight: '700' },
  pPrice: { color: '#444', marginTop: 4 },
  addBtn: { backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: '#fff', fontWeight: '700' },
  cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, borderColor: '#eee', backgroundColor: '#fafafa', padding: 12 },
  cartTitle: { fontWeight: '700', marginBottom: 6 },
  cartEmpty: { color: '#666' },
  cartItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  removeBtn: { backgroundColor: '#e53935', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  total: { fontWeight: '800', fontSize: 16 },
  actionBtn: { paddingVertical: 10, paddingHorizontal: 12, borderRadius: 8 },
  clearBtn: { backgroundColor: '#9E9E9E' },
  submitBtn: { backgroundColor: '#111' },
  actionBtnText: { color: '#fff', fontWeight: '700' },
  bannerInfo: { backgroundColor: '#1976D2', padding: 8, borderRadius: 8, marginBottom: 8 },
  bannerOk: { backgroundColor: '#2E7D32', padding: 8, borderRadius: 8, marginBottom: 8 },
  bannerError: { backgroundColor: '#C62828', padding: 8, borderRadius: 8, marginBottom: 8 },
  bannerText: { color: '#fff' },
  hint: { color: '#666', fontSize: 12, marginTop: 4 },
});
