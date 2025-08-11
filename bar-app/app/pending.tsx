import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from './context/AuthContext';

export default function Pending() {
  const { user, logout } = useAuth();
  console.log("Pending user:", user);
  if (!user) {
    logout();
    return null; // Si l'utilisateur n'est pas défini, on le déconnecte
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Compte en attente de validation</Text>
      <Text style={styles.text}>
        Votre compte ({user?.email}) est en attente de validation par un administrateur.
      </Text>
      <Text style={styles.text}>
        Vous serez notifié par email lorsque votre compte sera activé.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20
  },
  text: {
    textAlign: 'center',
    marginBottom: 10
  }
});