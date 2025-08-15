import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Alert, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { collection, onSnapshot, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import ProtectedRoute from '../components/protectedRoute';
import NavBar from '../components/NavBar';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'expo-router';

// Types
export type Role = 'admin' | 'serveur' | 'cuisine' | null;

type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  valide: boolean;
};


export default function Admin() {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Utilisateur>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      const data = snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Utilisateur[];
      setUtilisateurs(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const startEditing = (u: Utilisateur) => {
    setEditingId(u.id);
    setEditForm({ nom: u.nom, prenom: u.prenom, role: u.role, valide: u.valide });
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateDoc(doc(db, 'utilisateurs', id), editForm);
      setEditingId(null);
      Alert.alert('Succès', 'Utilisateur mis à jour');
    } catch (e: any) {
      Alert.alert('Erreur', e?.message ?? "Échec de la mise à jour");
    }
  };

    const confirmDelete = async (message: string) => {
    if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
      return window.confirm(message); // web
    }
    return new Promise<boolean>((resolve) => {
      Alert.alert('Confirmer la suppression', message, [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Supprimer', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  const handleDelete = async (id: string) => {
    if (currentUser?.uid === id) {
      Alert.alert('Action bloquée', "Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    const ok = await confirmDelete("Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.");
    if (!ok) return;

            try {
              await deleteDoc(doc(db, 'utilisateurs', id));
              Alert.alert('Succès', 'Utilisateur supprimé de la base de données.');
            } catch (e: any) {
              Alert.alert('Erreur', e?.message ?? "Échec de la suppression en base");
            }
          };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator />
        </View>
      </ProtectedRoute>
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
                  <TextInput
                    style={styles.input}
                    value={editForm.prenom ?? ''}
                    onChangeText={(v) => setEditForm({ ...editForm, prenom: v })}
                    placeholder="Prénom"
                  />
                  <TextInput
                    style={styles.input}
                    value={editForm.nom ?? ''}
                    onChangeText={(v) => setEditForm({ ...editForm, nom: v })}
                    placeholder="Nom"
                  />

                  {/* Sélecteur de rôle */}
                  <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginVertical: 10 }}>
                    {(['admin', 'serveur', 'cuisine'] as const).map((role) => (
                      <Pressable key={role} onPress={() => setEditForm({ ...editForm, role })} style={[styles.button, editForm.role === role && { backgroundColor: '#333' }]}>
                        <Text style={styles.buttonText}>{role}</Text>
                      </Pressable>
                    ))}
                    <Pressable onPress={() => setEditForm({ ...editForm, role: null })} style={[styles.button, editForm.role === null && { backgroundColor: '#333' }]}>
                      <Text style={styles.buttonText}>aucun</Text>
                    </Pressable>
                  </View>

                  {/* Toggle validation */}
                  <Pressable
                    style={[styles.button, { backgroundColor: editForm.valide ? '#4CAF50' : '#9E9E9E' }]}
                    onPress={() => setEditForm({ ...editForm, valide: !editForm.valide })}
                  >
                    <Text style={styles.buttonText}>{editForm.valide ? 'Validé' : 'En attente'}</Text>
                  </Pressable>

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
                  <View style={[styles.roleBadge, item.role === 'admin' && styles.adminBadge, item.role === 'serveur' && styles.serveurBadge, item.role === 'cuisine' && styles.cuisineBadge, item.role === null && styles.noneBadge]}>
                    <Text style={{ color: 'white' }}>{item.role ?? 'aucun'}</Text>
                  </View>
                  <Text>Statut : {item.valide ? 'Validé' : 'En attente'}</Text>
                  <View style={styles.container}>
                    <Text style={styles.title}>Admin</Text>
                    <Text style={styles.subtitle}>Choisis une section :</Text>

                    <Pressable style={styles.card} onPress={() => router.push('/admin/categories')}>
                      <Text style={styles.cardTitle}>Catégories</Text>
                      <Text style={styles.cardDesc}>Créer, renommer, supprimer des catégories.</Text>
                    </Pressable>

                    <Pressable style={styles.card} onPress={() => router.push('/admin/produits')}>
                      <Text style={styles.cardTitle}>Produits</Text>
                      <Text style={styles.cardDesc}>Créer, éditer, activer/désactiver, supprimer des produits.</Text>
                    </Pressable>
                  </View>
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
  noneBadge: { backgroundColor: '#9E9E9E' },
  subtitle: { color: '#666', marginBottom: 16 },
  cardTitle: { fontSize: 18, fontWeight: '800' },
  cardDesc: { color: '#666', marginTop: 4 },
});
