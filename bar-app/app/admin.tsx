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
import { globalStyles as styles } from './styles/globalStyles';

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

  if (!mounted) return null;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <View style={styles.container}>
        <Text style={styles.title}>👥 Liste des utilisateurs</Text>

        <FlatList
          data={utilisateurs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.user}>
              <Text style={styles.bold}>
                {item.nom} {item.prenom} — {item.email}
              </Text>
              <Text>Rôle : {item.role ?? 'non assigné'} | Validé : {item.valide ? '✅' : '⏳'}</Text>

              {!item.valide && (
                <>
                  <Picker
                    selectedValue={selectedRoles[item.id]}
                    onValueChange={(val) =>
                      setSelectedRoles((prev) => ({ ...prev, [item.id]: val }))
                    }
                    style={styles.picker}
                  >
                    <Picker.Item label="Choisir un rôle" value="" />
                    <Picker.Item label="Admin" value="admin" />
                    <Picker.Item label="Serveur" value="serveur" />
                    <Picker.Item label="Cuisine" value="cuisine" />
                  </Picker>

                  <Button
                    title="✅ Valider"
                    onPress={() => validerUtilisateur(item.id)}
                  />
                </>
              )}
            </View>
          )}
        />
      </View>
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  ...styles, // styles globaux
  user: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  bold: {
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 4,
  },
  picker: {
    borderWidth: 1,
    borderColor: '#ccc',
    marginVertical: 8,
  },
});
