import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Button, FlatList,
  Pressable, StyleSheet, Alert
} from 'react-native';
import {
  collection, addDoc, onSnapshot, updateDoc, deleteDoc, doc, getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { Picker } from '@react-native-picker/picker';

interface Produit{
  id: string;
  nom: string;
  prix: number;
  disponible: boolean;
  categorie: any; // DocumentReference
}

interface Categorie {
  id: string;
  nom: string;
}

export default function Produits() {
  const [produits, setProduits] = useState<any[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);

  const [nom, setNom] = useState('');
  const [prix, setPrix] = useState('');
  const [categorieId, setCategorieId] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedProduit, setEditedProduit] = useState<any>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'categories'), (snap) => {
      const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as Categorie[];
      setCategories(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'produits'), async (snap) => {
      const produitsData = await Promise.all(
        snap.docs.map(async (docSnap) => {
          const data = docSnap.data();
          const catSnap = await getDoc(data.categorie);
          return {
            id: docSnap.id,
            nom: data.nom,
            prix: data.prix,
            disponible: data.disponible,
            categorie: { id: catSnap.id, nom: (catSnap.data() as { nom?: string })?.nom || 'Inconnu' },
            categorieRef: data.categorie,
          };
        })
      );
      setProduits(produitsData);
    });
    return () => unsub();
  }, []);

  const ajouterProduit = async () => {
    if (!nom || !prix || !categorieId) return;
    const ref = doc(db, 'categories', categorieId);
    await addDoc(collection(db, 'produits'), {
      nom,
      prix: parseFloat(prix),
      disponible: true,
      categorie: ref,
    });
    setNom('');
    setPrix('');
    setCategorieId('');
  };

  const toggleDisponibilite = async (id: string, actuel: boolean) => {
    await updateDoc(doc(db, 'produits', id), { disponible: !actuel });
  };

  const supprimerProduit = (id: string) => {
    Alert.alert('Supprimer ?', 'Confirmez la suppression', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Supprimer',
        style: 'destructive',
        onPress: async () => {
          await deleteDoc(doc(db, 'produits', id));
        },
      },
    ]);
  };

  const startEdit = (produit: any) => {
    setEditingId(produit.id);
    setEditedProduit({
      nom: produit.nom,
      prix: produit.prix,
      categorieId: produit.categorie.id,
    });
  };

  const saveEdit = async (id: string) => {
    if (!editedProduit.nom || !editedProduit.prix || !editedProduit.categorieId) return;
    const ref = doc(db, 'categories', editedProduit.categorieId);
    await updateDoc(doc(db, 'produits', id), {
      nom: editedProduit.nom,
      prix: parseFloat(editedProduit.prix),
      categorie: ref,
    });
    setEditingId(null);
    setEditedProduit({});
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gestion des produits</Text>

      <TextInput placeholder="Nom" value={nom} onChangeText={setNom} style={styles.input} />
      <TextInput placeholder="Prix" value={prix} onChangeText={setPrix} style={styles.input} keyboardType="numeric" />
      <Picker
        selectedValue={categorieId}
        onValueChange={(val) => setCategorieId(val)}
        style={styles.input}
      >
        <Picker.Item label="Choisir une catégorie" value="" />
        {categories.map((cat) => (
          <Picker.Item key={cat.id} label={cat.nom} value={cat.id} />
        ))}
      </Picker>
      <Button title="Ajouter" onPress={ajouterProduit} />

      <FlatList
        style={{ marginTop: 20 }}
        data={produits}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {editingId === item.id ? (
              <>
                <TextInput
                  value={editedProduit.nom}
                  onChangeText={(text) => setEditedProduit({ ...editedProduit, nom: text })}
                  style={styles.input}
                />
                <TextInput
                  value={String(editedProduit.prix)}
                  onChangeText={(text) => setEditedProduit({ ...editedProduit, prix: text })}
                  keyboardType="numeric"
                  style={styles.input}
                />
                <Picker
                  selectedValue={editedProduit.categorieId}
                  onValueChange={(val) => setEditedProduit({ ...editedProduit, categorieId: val })}
                >
                  {categories.map((cat) => (
                    <Picker.Item key={cat.id} label={cat.nom} value={cat.id} />
                  ))}
                </Picker>
                <Button title="💾 Sauvegarder" onPress={() => saveEdit(item.id)} />
                <Button title="❌ Annuler" onPress={() => setEditingId(null)} />
              </>
            ) : (
              <>
                <Text>{item.nom} – {item.prix}€ ({item.categorie.nom})</Text>
                <View style={styles.actions}>
                  <Button title={item.disponible ? 'Disponible' : 'Indispo'} onPress={() => toggleDisponibilite(item.id, item.disponible)} />
                  <Button title="✏️" onPress={() => startEdit(item)} />
                  <Button title="🗑" color="#d32f2f" onPress={() => supprimerProduit(item.id)} />
                </View>
              </>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  card: {
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: 10,
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
});
