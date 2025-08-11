// app/profile.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/protectedRoute';
import NavBar from './components/NavBar';

export default function Profile() {
  const { user } = useAuth();

  return (
    <ProtectedRoute>
      <View style={styles.container}>
        <Text style={styles.title}>Mon profil</Text>
        {user && (
          <>
            <Text>Prénom : {user.prenom}</Text>
            <Text>Nom : {user.nom}</Text>
            <Text>Email : {user.email}</Text>
            <Text>Rôle : {user.role}</Text>
            <Text>Statut : {user.valide ? 'Validé' : 'En attente'}</Text>
          </>
        )}
      </View>
      <NavBar />
    </ProtectedRoute>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
});