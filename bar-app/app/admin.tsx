import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import {
  collection,
  addDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase'; // Assure-toi que ce fichier existe
import ProtectedRoute from './protectedRoute';
import { globalStyles as styles } from './styles/globalStyles';


type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'serveur' | 'cuisine' | 'admin';
};

export default function Admin() {
  const [mounted, setMounted] = useState(false);
  const [nom, setNom] = useState('');
  const [prenom, setPrenom] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'serveur' | 'cuisine' | 'admin'>('serveur');
  const [utilisateurs, setUtilisateurs] = useState<Utilisateur[]>([]);



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
        ...(doc.data() as Omit<Utilisateur, 'id'>),
      }));
      setUtilisateurs(data);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'utilisateurs'), (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<Utilisateur, 'id'>),
      }));
      setUtilisateurs(data);
    });

    return () => unsub();
  }, []);

  return (
    <ProtectedRoute allowedRoles={['admin']}>
    <View style={styles.container}>
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
    </View>
    </ProtectedRoute>
  );
}

