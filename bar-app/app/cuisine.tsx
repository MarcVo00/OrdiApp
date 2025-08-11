import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useEffect, useState } from 'react';
//import ProtectedRoute from './protectedRoute';
import { collection, onSnapshot, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../firebase'; // Ensure this imports the db from your firebase config
type Commande = {
  id: string;
  table: string;
  produits: { name: string; price: number }[];
  statut: string;
};

const STATUTS = ['en_attente', 'en_preparation', 'pret'];





export default function Cuisine() {
  const [commandes, setCommandes] = useState<Commande[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'commandes'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Commande[];
      setCommandes(data);
    });

    return () => unsub();
  }, []);

  const avancerCommande = async (commande: Commande) => {
    const index = STATUTS.indexOf(commande.statut);
    if (index < STATUTS.length - 1) {
      const newStatut = STATUTS[index + 1];
      await updateDoc(doc(db, 'commandes', commande.id), {
        statut: newStatut,
      });
    }
  };


  return (
    <View style={styles.container}>
      <Text style={styles.title}>Interface Cuisine</Text>

      {STATUTS.map((statut) => (
        <View key={statut} style={styles.column}>
          <Text style={styles.subtitle}>{statut.replace('_', ' ').toUpperCase()}</Text>
          <FlatList
            data={commandes.filter((cmd) => cmd.statut === statut)}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.card}>
                <Text style={styles.table}>Table {item.table}</Text>
                {item.produits.map((p, i) => (
                  <Text key={i}>• {p.name}</Text>
                ))}
                {statut !== 'pret' && (
                  <Pressable
                    onPress={() => avancerCommande(item)}
                    style={styles.button}
                  >
                    <Text style={styles.buttonText}>➡️ Avancer</Text>
                  </Pressable>
                )}
              </View>
            )}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  column: { marginBottom: 24 },
  card: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#f9f9f9',
  },
  table: { fontWeight: 'bold', marginBottom: 4 },
  button: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#000',
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
