import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography, Button, Grid, Card, CardContent, TextField, Select, MenuItem, CardActions } from '@mui/material';
import axios from 'axios';

export default function ServerView() {
  const [tables, setTables] = useState<number[]>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  const [selectedTable, setSelectedTable] = useState<number>(1);
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<any[]>([]);

  useEffect(() => {
    axios.get('http://localhost:5000/api/products')
      .then(res => setProducts(res.data));
  }, []);

  const addToCart = (product: any) => {
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

  const submitOrder = () => {
    axios.post('http://localhost:5000/api/orders', {
      table_number: selectedTable,
      order_lines: cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity
      }))
    }).then(() => {
      alert(`Commande pour la table ${selectedTable} envoyée !`);
      setCart([]);
    });
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Interface Serveur
      </Typography>

      <Box mb={3} display="flex" alignItems="center">
        <Typography sx={{ mr: 2 }}>Table :</Typography>
        <Select
          value={selectedTable}
          onChange={(e) => setSelectedTable(Number(e.target.value))}
          sx={{ minWidth: 100 }}
        >
          {tables.map(table => (
            <MenuItem key={table} value={table}>
              Table {table}
            </MenuItem>
          ))}
        </Select>
      </Box>

      <Grid container spacing={3}>
        {products.map(product => (
          <Grid item xs={12} sm={6} md={4} key={product.id} component={"div" as any}>
            <Card>
              <CardContent>
                <Typography variant="h6">{product.name}</Typography>
                <Typography color="text.secondary">
                  {product.sell_price} €
                </Typography>
              </CardContent>
              <CardActions>
                <Button size="small" onClick={() => addToCart(product)}>
                  Ajouter à la commande
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {cart.length > 0 && (
        <Box mt={4} p={3} sx={{ border: '1px solid #ddd', borderRadius: 1 }}>
          <Typography variant="h5" gutterBottom>
            Commande pour la table {selectedTable}
          </Typography>
          {cart.map(item => (
            <Box key={item.product.id} display="flex" alignItems="center" mb={2}>
              <Typography sx={{ flexGrow: 1 }}>
                {item.product.name} × {item.quantity}
              </Typography>
              <Typography>
                {(item.product.sell_price * item.quantity).toFixed(2)} €
              </Typography>
            </Box>
          ))}
          <Button
            variant="contained"
            onClick={submitOrder}
            fullWidth
            size="large"
          >
            Valider la commande (Total: {cart.reduce((sum, item) => sum + (item.product.sell_price * item.quantity), 0).toFixed(2)} €)
          </Button>
        </Box>
      )}
    </Box>
  );
}