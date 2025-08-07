import { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TextInput, Pressable } from 'react-native';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ProtectedRoute from './protectedRoute';
import { useAuth } from './context/AuthContext';

type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'serveur' | 'cuisine';
  valide: boolean;
};

export default function Admin() {
  const { user: currentUser } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Utilisateur>>({});

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Utilisateur[];
      setUtilisateurs(data);
    });
    return () => unsub();
  }, []);

  const startEditing = (user: Utilisateur) => {
    setEditingId(user.id);
    setEditForm({
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      valide: user.valide
    });
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.role) {
      Alert.alert('Erreur', 'Le rôle est obligatoire');
      return;
    }

    try {
      await updateDoc(doc(db, 'utilisateurs', id), editForm);
      setEditingId(null);
      Alert.alert('Succès', 'Utilisateur mis à jour');
    } catch (error) {
      Alert.alert('Erreur', 'Échec de la mise à jour');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cet utilisateur ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'utilisateurs', id));
              Alert.alert('Succès', 'Utilisateur supprimé');
            } catch (error) {
              Alert.alert('Erreur', 'Échec de la suppression');
            }
          },
        },
      ]
    );
  };

  const styles = StyleSheet.create({
    container: { padding: 20, backgroundColor: '#fff', flex: 1 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
    card: {
      padding: 15,
      marginBottom: 10,
      borderWidth: 1,
      borderColor: '#ddd',
      borderRadius: 8,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between' },
    userName: { fontSize: 18, fontWeight: 'bold' },
    input: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderRadius: 4,
      padding: 8,
      marginVertical: 5,
    },
    button: {
      padding: 10,
      borderRadius: 5,
      marginTop: 5,
      alignItems: 'center',
    },
    saveButton: { backgroundColor: '#4CAF50' },
    editButton: { backgroundColor: '#2196F3' },
    deleteButton: { backgroundColor: '#f44336' },
    buttonText: { color: 'white', fontWeight: 'bold' },
    roleBadge: {
      padding: 5,
      borderRadius: 10,
      alignSelf: 'flex-start',
      marginTop: 5,
    },
    adminBadge: { backgroundColor: '#FF5722' },
    serveurBadge: { backgroundColor: '#673AB7' },
    cuisineBadge: { backgroundColor: '#009688' },
  });

  return (
      <View style={styles.container}>
        <Text style={styles.title}>Gestion des utilisateurs</Text>
        
        <FlatList
          data={utilisateurs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              {editingId === item.id ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={editForm.nom}
                    onChangeText={(text) => setEditForm({...editForm, nom: text})}
                    placeholder="Nom"
                  />
                  <TextInput
                    style={styles.input}
                    value={editForm.prenom}
                    onChangeText={(text) => setEditForm({...editForm, prenom: text})}
                    placeholder="Prénom"
                  />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 }}>
                    {(['admin', 'serveur', 'cuisine'] as const).map((role) => (
                      <Pressable
                        key={role}
                        onPress={() => setEditForm({...editForm, role})}
                        style={[
                          styles.button,
                          editForm.role === role && { backgroundColor: '#333' }
                        ]}
                      >
                        <Text style={styles.buttonText}>{role}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    style={[styles.button, styles.saveButton]}
                    onPress={() => handleUpdate(item.id)}
                  >
                    <Text style={styles.buttonText}>Enregistrer</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <View style={styles.header}>
                    <Text style={styles.userName}>{item.prenom} {item.nom}</Text>
                    {currentUser?.uid !== item.id && (
                      <View style={{ flexDirection: 'row' }}>
                        <Pressable
                          style={[styles.button, styles.editButton, { marginRight: 5 }]}
                          onPress={() => startEditing(item)}
                        >
                          <Text style={styles.buttonText}>✏️</Text>
                        </Pressable>
                        <Pressable
                          style={[styles.button, styles.deleteButton]}
                          onPress={() => handleDelete(item.id)}
                        >
                          <Text style={styles.buttonText}>🗑️</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                  <Text>{item.email}</Text>
                  <View style={[
                    styles.roleBadge,
                    item.role === 'admin' && styles.adminBadge,
                    item.role === 'serveur' && styles.serveurBadge,
                    item.role === 'cuisine' && styles.cuisineBadge,
                  ]}>
                    <Text style={{ color: 'white' }}>{item.role}</Text>
                  </View>
                  <Text>Statut: {item.valide ? 'Validé' : 'En attente'}</Text>
                </>
              )}
            </View>
          )}
        />
      </View>
  );
}