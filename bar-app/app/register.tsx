import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  FlatList,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  collection,
  addDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import ProtectedRoute from './protectedRoute';
import { useRouter } from 'expo-router';
import { globalStyles as styles } from './styles/globalStyles';

export default function Admin() {
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'serveur' | 'cuisine' | 'admin'>('serveur');
  const [utilisateurs, setUtilisateurs] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  const ajouterUtilisateur = async () => {
    if (!nom || !prenom || !email) return Alert.alert('Champs requis');

    try {
      await addDoc(collection(db, 'utilisateurs'), {
        nom,
        prenom,
        email,
        role,
        createdAt: Timestamp.now(),
      });

      setNom('');
      setPrenom('');
      setEmail('');
      setRole('serveur');
    } catch (e) {
      Alert.alert('Erreur lors de l’ajout');
    }
  };

    useEffect(() => {
        setMounted(true);
        const unsub = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
        const data = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
        }));
        setUtilisateurs(data);
        });
    
        return () => {
        unsub();
        };
    }, []);

    if (!mounted) return null;

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>👤 Ajouter un utilisateur</Text>

        <TextInput
          placeholder="Nom"
          value={nom}
          onChangeText={setNom}
          style={styles.input}
        />
        <TextInput
          placeholder="Prénom"
          value={prenom}
          onChangeText={setPrenom}
          style={styles.input}
        />
        <TextInput
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          style={styles.input}
          keyboardType="email-address"
        />
        <View style={styles.roles}>
          {['serveur', 'cuisine', 'admin'].map((r) => (
            <Button
              key={r}
              title={r}
              onPress={() => setRole(r as any)}
              color={role === r ? '#000' : '#ccc'}
            />
          ))}
        </View>

        <Button title="Ajouter" onPress={ajouterUtilisateur} />

        <Text style={styles.subtitle}>📋 Utilisateurs enregistrés</Text>
        <FlatList
          data={utilisateurs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.user}>
              <Text>{item.nom} {item.prenom} ({item.role})</Text>
              <Text style={styles.email}>{item.email}</Text>
            </View>
          )}
        />

        <Text style={styles.subtitle}>🛠 Accès admin</Text>
        <Button title="Gérer les produits" onPress={() => router.push('/produits')} />
        <Button title="Gérer les catégories" onPress={() => router.push('/categories')} />
        <Button title="Voir statistiques" onPress={() => router.push('/stats')} />
        <Button title="Créer un compte" onPress={() => router.push('/register')} />
      </ScrollView>
    </ProtectedRoute>
  );
}