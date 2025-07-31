// admin.tsx
import { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet, Alert } from 'react-native';
import {
  collection,
  onSnapshot,
  updateDoc,
  doc,
} from 'firebase/firestore';
import { db } from '../firebase';
import ProtectedRoute from './protectedRoute';
import { Picker } from '@react-native-picker/picker';


type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'serveur' | 'cuisine' | null;
  valide: boolean;
};

export default function Admin() {
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [mounted, setMounted] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, 'admin' | 'serveur' | 'cuisine'>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Utilisateur, 'id'>),
      }));
      setUtilisateurs(data);

      // Pré-sélectionner un rôle par défaut pour les utilisateurs non-validés
      const defaults: Record<string, 'admin' | 'serveur' | 'cuisine'> = {};
      data.forEach((u) => {
        if (!u.valide) {
          defaults[u.id] = u.role ?? 'serveur';
        }
      });
      setSelectedRoles(defaults);
    });

    setMounted(true);
    return () => unsub();
  }, []);

  const validerUtilisateur = async (id: string) => {
    const role = selectedRoles[id];
    if (!role) {
      Alert.alert('Erreur', 'Veuillez sélectionner un rôle');
      return;
    }

    await updateDoc(doc(db, 'utilisateurs', id), {
      valide: true,
      role,
    });

    Alert.alert('Utilisateur validé');
  };

  //tri les utilisateurs non validés d'abord
  utilisateurs.sort((a, b) => {
    if (!a.valide && b.valide) return -1;
    if (a.valide && !b.valide) return 1;
    return 0;
  });

  if (!mounted) return null;


  const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: 20,
      backgroundColor: '#fff',
    },
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      marginBottom: 20,
    },
    userCard: {
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 5,
    },
    userName: {
      fontSize: 18,
      fontWeight: 'bold',
    },
    picker: {
      height: 50,
      width: '100%',
      marginVertical: 10,
    },
  });
  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <View style={styles.container}>
        <Text style={styles.title}>Gestion des utilisateurs</Text>
        <FlatList
          data={utilisateurs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <Text style={styles.userName}>{item.prenom} {item.nom}</Text>
              <Text>{item.email}</Text>
              {!item.valide && (
                <>
                  <Picker
                    selectedValue={selectedRoles[item.id] || 'serveur'}
                    onValueChange={(value) => setSelectedRoles({ ...selectedRoles, [item.id]: value })}
                    style={styles.picker}
                  >
                    <Picker.Item label="Admin" value="admin" />
                    <Picker.Item label="Serveur" value="serveur" />
                    <Picker.Item label="Cuisine" value="cuisine" />
                  </Picker>
                  <Button title="Valider l'utilisateur" onPress={() => validerUtilisateur(item.id)} />
                </>
              )}
            </View>
          )}
        />
      </View>
    </ProtectedRoute>
  );
}
