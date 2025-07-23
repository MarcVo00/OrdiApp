import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  SafeAreaView,
} from 'react-native';

const CATEGORIES = ['Snacks', 'Desserts', 'Plats', 'Cocktails', 'Shots', 'Softs', 'Long drinks'];

const MOCK_PRODUCTS = {
  Cocktails: [
    { id: '1', name: 'Mojito', price: 7 },
    { id: '2', name: 'Moscow Mule', price: 7 },
    { id: '3', name: 'Old Fashioned', price: 7 },
  ],
  Snacks: [
    { id: '4', name: 'Frites', price: 4 },
    { id: '5', name: 'Nuggets', price: 5 },
  ],
  // Ajoute d'autres catégories ici
};

export default function MenuClient() {
  const { tableId } = useLocalSearchParams();
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('Cocktails');
  const [cart, setCart] = useState<{ id: string; name: string; price: number }[]>([]);

  const addToCart = (item: any) => {
    setCart([...cart, item]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Table {tableId}</Text>

      <View style={styles.categories}>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.categoryButton,
              selectedCategory === cat && styles.categorySelected,
            ]}
          >
            <Text>{cat}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 12 },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    backgroundColor: '#eee',
    padding: 8,
    borderRadius: 6,
  },
  categorySelected: {
    backgroundColor: '#ddd',
  },
  item: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: '#f0f0f0',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  checkout: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  checkoutText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});
