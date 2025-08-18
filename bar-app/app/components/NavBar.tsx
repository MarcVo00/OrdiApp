// app/components/NavBar.tsx
import { View, Pressable, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const goTo = (path: string) => {
    router.push(path);
  };

  if (!user) return null;

  return (
    <View style={styles.navbar}>
      {user.role === 'admin' && (
        <Pressable onPress={() => goTo('admin/settings')} style={styles.item}>
          <Text style={styles.text}>Admin</Text>
        </Pressable>
      )}
      {(user.role === 'serveur' || user.role === 'admin') && (
        <Pressable onPress={() => goTo('/serveur')} style={styles.item}>
          <Text style={styles.text}>Serveur</Text>
        </Pressable>
      )}
      {(user.role === 'cuisine' || user.role === 'serveur' || user.role === 'admin') && (
        <Pressable onPress={() => goTo('/cuisine')} style={styles.item}>
          <Text style={styles.text}>Cuisine</Text>
        </Pressable>
      )}
      <Pressable onPress={() => goTo('/profile')} style={styles.item}>
        <Text style={styles.text}>Profil</Text>
      </Pressable>
      <Pressable onPress={logout} style={styles.item}>
        <Text style={styles.text}>Déconnexion</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: '#111',
  },
  item: {
    paddingHorizontal: 10,
  },
  text: {
    color: 'white',
    fontWeight: '600',
  },
});