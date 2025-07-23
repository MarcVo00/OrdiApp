import { useRouter } from 'expo-router';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useCart } from './context/Cartcontext';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useLocalSearchParams } from 'expo-router';

const db = getFirestore();

export default function Panier() {
  const router = useRouter();
  const { cart, removeFromCart, clearCart } = useCart();
  const { tableId } = useLocalSearchParams();

  const total = cart.reduce((sum, item) => sum + item.price, 0);

  const envoyerCommande = async () => {
    try {
      await addDoc(collection(db, 'commandes'), {
        table: tableId,
        produits: cart,
        statut: 'en_attente',
        createdAt: serverTimestamp(),
      });
      clearCart();
      Alert.alert('Commande envoyée !');
      router.replace(`/client/${tableId}`);
    } catch (error) {
      Alert.alert('Erreur lors de l’envoi');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panier</Text>

      <FlatList
        data={cart}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.name} - {item.price} €</Text>
            <Pressable onPress={() => removeFromCart(item.id)}>
              <Text style={styles.remove}>Supprimer</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={<Text>Votre panier est vide.</Text>}
      />

      <Text style={styles.total}>Total : {total.toFixed(2)} €</Text>

      <Pressable style={styles.button} onPress={envoyerCommande}>
        <Text style={styles.buttonText}>Envoyer la commande</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16 },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    paddingBottom: 8,
  },
  remove: { color: 'red' },
  total: { fontSize: 18, fontWeight: '600', marginTop: 20 },
  button: {
    backgroundColor: 'black',
    padding: 16,
    borderRadius: 8,
    marginTop: 24,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: 'bold' },
});
