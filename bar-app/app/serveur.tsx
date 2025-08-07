import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Pressable,
  Alert,
} from 'react-native';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  updateDoc,
  deleteDoc,
  doc,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase';
import ProtectedRoute from './protectedRoute';
import { useAuth } from './context/AuthContext';



type Commande = {
  id: string;
  table: string;
  produits: { name: string; price: number }[];
  statut: string;
  createdAt?: any;
};

const STATUTS = ['en_attente', 'en_preparation', 'pret'];




export default function Serveur() {
  const { user } = useAuth();

  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [filtre, setFiltre] = useState<'toutes' | 'en_attente' | 'en_preparation' | 'pret'>('toutes');

  useEffect(() => {
    const q = query(collection(db, 'commandes'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as DocumentData),
      })) as Commande[];
      setCommandes(data);
    });

    return () => unsub();
  }, []);

  const commandesFiltrées =
    filtre === 'toutes' ? commandes : commandes.filter((c) => c.statut === filtre);

  const changerStatut = async (commande: Commande) => {
    const index = STATUTS.indexOf(commande.statut);
    if (index < STATUTS.length - 1) {
      const nouveau = STATUTS[index + 1];
      await updateDoc(doc(db, 'commandes', commande.id), { statut: nouveau });
    }
  };

  const supprimerCommande = (id: string) => {
    Alert.alert(
      'Supprimer la commande ?',
      'Cette action est irréversible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await deleteDoc(doc(db, 'commandes', id));
          },
        },
      ]
    );
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'serveur']}>
    <View style={styles.container}>
      <Text style={styles.title}>Interface Serveur</Text>
      <View style={styles.filtres}>
        {['toutes', 'en_attente', 'en_preparation', 'pret'].map((statut) => (
          <Pressable
            key={statut}
            onPress={() => setFiltre(statut as any)}
            style={[
              styles.filtre,
              filtre === statut && styles.filtreActif,
            ]}
          >
            <Text style={filtre === statut ? styles.filtreTexteActif : styles.filtreTexte}>
              {statut.replace('_', ' ')}
            </Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={commandesFiltrées}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.table}>Table {item.table}</Text>
            <Text style={styles.statut}>Statut : {item.statut}</Text>
            {item.produits.map((p, i) => (
              <Text key={i}>• {p.name} ({p.price}€)</Text>
            ))}
            {item.createdAt?.seconds && (
              <Text style={styles.date}>
                Le {new Date(item.createdAt.seconds * 1000).toLocaleString()}
              </Text>
            )}
            <View style={styles.actions}>
              {item.statut !== 'pret' && (
                <Pressable
                  style={styles.button}
                  onPress={() => changerStatut(item)}
                >
                  <Text style={styles.buttonText}>➡️ Avancer</Text>
                </Pressable>
              )}
              <Pressable
                style={[styles.button, styles.danger]}
                onPress={() => supprimerCommande(item.id)}
              >
                <Text style={styles.buttonText}>🗑 Supprimer</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  filtres: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  filtre: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 6,
  },
  filtreActif: {
    backgroundColor: '#000',
  },
  filtreTexte: {
    color: '#000',
  },
  filtreTexteActif: {
    color: '#fff',
  },
  card: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  table: { fontWeight: 'bold', fontSize: 16 },
  statut: { fontStyle: 'italic', color: '#555', marginBottom: 4 },
  date: { fontSize: 12, color: '#999', marginTop: 4 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  button: {
    backgroundColor: '#000',
    padding: 8,
    borderRadius: 6,
  },
  danger: {
    backgroundColor: '#d32f2f',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
