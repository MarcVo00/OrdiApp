import { useEffect, useState } from 'react';
import { View, Text, TextInput, Button, FlatList, StyleSheet, Alert } from 'react-native';
import {
  collection,
  addDoc,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase'; // Assure-toi que ce fichier existe

type Utilisateur = {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: 'serveur' | 'cuisine' | 'admin';
};

export default function Admin() {
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
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#fff', flex: 1 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 16 },
  subtitle: { fontSize: 18, fontWeight: '600', marginTop: 24 },
  input: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 6,
    marginBottom: 10,
    borderColor: '#ddd',
  },
  roles: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  user: {
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingVertical: 10,
  },
  email: {
    fontSize: 12,
    color: '#777',
  },
});
