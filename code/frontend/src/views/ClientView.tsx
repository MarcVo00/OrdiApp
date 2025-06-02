import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Grid, Card, CardContent, CardActions, TextField } from '@mui/material';
import { Add, Remove, ShoppingCart } from '@mui/icons-material';
import axios from 'axios';

type Product = {
  id: number;
  name: string;
  sell_price: number;
  category: {
    name: string;
  };
};

type CartItem = {
  product: Product;
  quantity: number;
};

export default function ClientView() {
  const { tableNumber } = useParams<{ tableNumber: string }>();
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  useEffect(() => {
    // Charger les produits
    axios.get(`http://localhost:5000/api/products`)
      .then(res => {
        setProducts(res.data);
        const uniqueCategories = [...new Set(res.data.map((p: Product) => p.category.name))]
        setCategories(uniqueCategories as string[]);
        if (uniqueCategories.length > 0) setSelectedCategory(uniqueCategories[0] as string);
      });
    
    // Charger le panier existant
    axios.get(`http://localhost:5000/api/orders/table/${tableNumber}`)
      .then(res => {
        if (res.data?.order_lines) {
          setCart(res.data.order_lines.map((item: any) => ({
            product: item.product,
            quantity: item.quantity
          })));
        }
      });
  }, [tableNumber]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCart(prev =>
      prev.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const submitOrder = () => {
    axios.post(`http://localhost:5000/api/orders`, {
      table_number: parseInt(tableNumber || '0'),
      order_lines: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }))
    }).then(() => {
      alert('Commande envoyée !');
      setCart([]);
    });
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Table {tableNumber} - Menu
      </Typography>

      {/* Filtres par catégorie */}
      <Box mb={3}>
        {categories.map(category => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'contained' : 'outlined'}
            onClick={() => setSelectedCategory(category)}
            sx={{ mr: 1 }}
          >
            {category}
          </Button>
        ))}
      </Box>

      {/* Liste des produits */}
      <Grid container spacing={3}>
        {products
            .filter(p => p.category.name === selectedCategory)
            .map(product => (
            <Grid item xs={12} sm={6} md={4} key={product.id} component={"div" as any}>
                <Card>
                <CardContent>
                    <Typography variant="h6">{product.name}</Typography>
                    <Typography color="text.secondary">
                    {product.sell_price} €
                    </Typography>
                </CardContent>
                <CardActions>
                    <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => addToCart(product)}
                    >
                    Ajouter
                    </Button>
                </CardActions>
                </Card>
            </Grid>
            ))}
        </Grid>

      {/* Panier */}
      {cart.length > 0 && (
        <Box mt={4} p={3} sx={{ border: '1px solid #ddd', borderRadius: 1 }}>
          <Typography variant="h5" gutterBottom>
            Votre commande
          </Typography>
          {cart.map(item => (
            <Box key={item.product.id} display="flex" alignItems="center" mb={2}>
              <Typography sx={{ flexGrow: 1 }}>
                {item.product.name} × {item.quantity}
              </Typography>
              <Button onClick={() => updateQuantity(item.product.id, item.quantity - 1)}>
                <Remove />
              </Button>
              <TextField
                value={item.quantity}
                onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 1)}
                type="number"
                sx={{ width: 60, mx: 1 }}
              />
              <Button onClick={() => updateQuantity(item.product.id, item.quantity + 1)}>
                <Add />
              </Button>
              <Typography sx={{ ml: 2 }}>
                {(item.product.sell_price * item.quantity).toFixed(2)} €
              </Typography>
            </Box>
          ))}
          <Button
            variant="contained"
            startIcon={<ShoppingCart />}
            onClick={submitOrder}
            fullWidth
            size="large"
          >
            Commander (Total: {cart.reduce((sum, item) => sum + (item.product.sell_price * item.quantity), 0).toFixed(2)} €)
          </Button>
        </Box>
      )}
    </Box>
  );
}