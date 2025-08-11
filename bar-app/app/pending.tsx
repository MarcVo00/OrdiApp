import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from './context/AuthContext';
import { useRouter } from 'expo-router';

export default function Pending() {
  const { user, logout } = useAuth();
  const router = useRouter();
  console.log("Pending user:", user);
  if (!user) {
    logout();
    return null;
  } else if (user.valide) {
    alert("Votre compte est déjà validé. Vous serez redirigé vers la page appropriée.");
    // Si l'utilisateur est déjà validé, on le redirige vers la page appropriée
    switch (user.role) {
      case 'admin':
        router.replace('/admin');
        break;
      case 'serveur':
        router.replace('/serveur');
        break;
      case 'cuisine':
        router.replace('/cuisine');
        break;
      default:
        router.replace('/login');
    }
    return null; // Si l'utilisateur est déjà validé, on ne rend rien
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