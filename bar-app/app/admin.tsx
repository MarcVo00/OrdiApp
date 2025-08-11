// app/admin.tsx
import { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'expo-router';
import ProtectedRoute from './components/protectedRoute';
import NavBar from './components/NavBar';
import { db } from '../firebase'; // Assurez-vous que le chemin est correct

interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'admin' | 'serveur' | 'cuisine' | null;
  valide: boolean;
}

export default function Admin() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (user.role !== 'admin') {
      // Rediriger l’utilisateur non admin vers sa page
      if (user.role === 'serveur') router.replace('/serveur');
      else if (user.role === 'cuisine') router.replace('/cuisine');
      else router.replace('/login');
    }
  }, [user, loading]);

  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Utilisateur>>({});

  useEffect(() => {
    if (!user || user.role !== 'admin') return;
    const unsub = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Utilisateur[];
      setUtilisateurs(data);
    });
    return () => unsub();
  }, [user]);

  const startEditing = (u: Utilisateur) => {
    setEditingId(u.id);
    setEditForm({ nom: u.nom, prenom: u.prenom, role: u.role, valide: u.valide });
  };

  const handleUpdate = async (id: string) => {
    if (!editForm.role && editForm.role !== null) {
      Alert.alert('Erreur', 'Le rôle est obligatoire (ou null).');
      return;
    }
    try {
      await updateDoc(doc(db, 'utilisateurs', id), editForm);
      setEditingId(null);
      Alert.alert('Succès', 'Utilisateur mis à jour');
    } catch (e) {
      Alert.alert('Erreur', "Échec de la mise à jour");
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(
      'Confirmer la suppression',
      'Voulez-vous vraiment supprimer cet utilisateur de la base de données ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDoc(doc(db, 'utilisateurs', id));
              Alert.alert('Succès', 'Utilisateur supprimé de la base de données');
            } catch (error) {
              console.error('Erreur suppression Firestore:', error);
              Alert.alert('Erreur', 'Échec de la suppression dans Firestore');
            }
          },
        },
      ]
    );
  };

  if (loading || !user || user.role !== 'admin') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
    <View style={styles.container}>
      <Text style={styles.title}>Gestion des utilisateurs</Text>

      <FlatList
        data={utilisateurs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            {editingId === item.id ? (
              <>
                <TextInput style={styles.input} value={editForm.nom ?? ''} onChangeText={(v) => setEditForm({ ...editForm, nom: v })} placeholder="Nom" />
                <TextInput style={styles.input} value={editForm.prenom ?? ''} onChangeText={(v) => setEditForm({ ...editForm, prenom: v })} placeholder="Prénom" />

                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 }}>
                  {(['admin', 'serveur', 'cuisine'] as const).map((role) => (
                    <Pressable key={role} onPress={() => setEditForm({ ...editForm, role })} style={[styles.button, editForm.role === role && { backgroundColor: '#333' }]}>
                      <Text style={styles.buttonText}>{role}</Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={() => setEditForm({ ...editForm, role: null })} style={[styles.button, editForm.role === null && { backgroundColor: '#333' }]}>
                    <Text style={styles.buttonText}>aucun</Text>
                  </Pressable>
                  <Pressable style={[styles.button, { backgroundColor: editForm.valide ? '#4CAF50' : '#9E9E9E' }]} onPress={() => setEditForm({ ...editForm, valide: !editForm.valide })}>
                    <Text style={styles.buttonText}>{editForm.valide ? 'Validé' : 'En attente'}</Text>
                  </Pressable>
                </View>

                <Pressable style={[styles.button, styles.saveButton]} onPress={() => handleUpdate(item.id)}>
                  <Text style={styles.buttonText}>Enregistrer</Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.header}>
                  <Text style={styles.userName}>{item.prenom} {item.nom}</Text>
                  <View style={{ flexDirection: 'row' }}>
                    <Pressable style={[styles.button, styles.editButton, { marginRight: 6 }]} onPress={() => startEditing(item)}>
                      <Text style={styles.buttonText}>✏️</Text>
                    </Pressable>
                    <Pressable style={[styles.button, styles.deleteButton]} onPress={() => handleDelete(item.id)}>
                      <Text style={styles.buttonText}>🗑️</Text>
                    </Pressable>
                  </View>
                </View>
                <Text>{item.email}</Text>
                <View style={[styles.roleBadge, item.role === 'admin' && styles.adminBadge, item.role === 'serveur' && styles.serveurBadge, item.role === 'cuisine' && styles.cuisineBadge]}>
                  <Text style={{ color: 'white' }}>{item.role ?? 'aucun'}</Text>
                </View>
                <Text>Statut : {item.valide ? 'Validé' : 'En attente'}</Text>
              </>
            )}
          </View>
        )}
      />
    </View>
    <NavBar />
  </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  card: { padding: 15, marginBottom: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  userName: { fontSize: 18, fontWeight: 'bold' },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 4, padding: 8, marginVertical: 5 },
  button: { padding: 10, borderRadius: 5, marginTop: 5, alignItems: 'center', backgroundColor: '#111' },
  saveButton: { backgroundColor: '#4CAF50' },
  editButton: { backgroundColor: '#2196F3' },
  deleteButton: { backgroundColor: '#f44336' },
  buttonText: { color: 'white', fontWeight: 'bold' },
  roleBadge: { padding: 5, borderRadius: 10, alignSelf: 'flex-start', marginTop: 5, backgroundColor: '#999' },
  adminBadge: { backgroundColor: '#FF5722' },
  serveurBadge: { backgroundColor: '#673AB7' },
  cuisineBadge: { backgroundColor: '#009688' },
});