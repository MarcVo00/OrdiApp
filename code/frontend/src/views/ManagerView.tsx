import { useState, useEffect } from 'react';
import { Box, Typography, Button, Grid, Card, CardContent, TextField, Dialog, DialogTitle, DialogContent, DialogActions, CardActions, MenuItem } from '@mui/material';
import axios from 'axios';

type Product = {
  id: number;
  name: string;
  buy_price: number;
  sell_price: number;
  stock: number;
  category: {
    name: string;
  };
};

export default function ManagerView() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = () => {
    axios.get('http://localhost:5000/api/products')
      .then(res => {
        setProducts(res.data);
        const uniqueCategories = Array.from(new Set<string>(res.data.map((p: Product) => p.category.name)));
        setCategories(uniqueCategories);
      });
  };

  const handleSaveProduct = () => {
    if (!editingProduct) return;

    const method = editingProduct.id ? 'put' : 'post';
    const url = editingProduct.id 
      ? `http://localhost:5000/api/products/${editingProduct.id}`
      : 'http://localhost:5000/api/products';

    axios[method](url, editingProduct)
      .then(() => {
        loadProducts();
        setOpenDialog(false);
      });
  };

  const handleDeleteProduct = (id: number) => {
    if (window.confirm('Supprimer ce produit ?')) {
      axios.delete(`http://localhost:5000/api/products/${id}`)
        .then(loadProducts);
    }
  };

  return (
    <Box p={3}>
      <Typography variant="h4" gutterBottom>
        Interface Manager
      </Typography>

      <Button 
        variant="contained" 
        onClick={() => {
          setEditingProduct({
            id: 0,
            name: '',
            buy_price: 0,
            sell_price: 0,
            stock: 0,
            category: { name: categories[0] || '' }
          });
          setOpenDialog(true);
        }}
        sx={{ mb: 3 }}
      >
        Ajouter un produit
      </Button>

      <Grid container spacing={3}>
      {products.map((product: Product) => (
        <Grid 
          item 
          xs={12} 
          sm={6} 
          md={4} 
          key={product.id}
          sx={{ display: 'flex' }} // Ensures consistent card heights
          component={'div' as any} // TypeScript workaround for Grid component
        >
          <Card sx={{ 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                {product.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Achat:</strong> {product.buy_price.toFixed(2)} €
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Vente:</strong> {product.sell_price.toFixed(2)} €
              </Typography>
              <Typography variant="body2" color={product.stock < 5 ? 'error' : 'text.secondary'}>
                <strong>Stock:</strong> {product.stock}
              </Typography>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                Catégorie: {product.category.name}
              </Typography>
            </CardContent>
            <CardActions sx={{ justifyContent: 'flex-end' }}>
              <Button 
                size="small" 
                onClick={() => {
                  setEditingProduct(product);
                  setOpenDialog(true);
                }}
                sx={{ mr: 1 }}
              >
                Modifier
              </Button>
              <Button 
                size="small" 
                color="error"
                onClick={() => handleDeleteProduct(product.id)}
              >
                Supprimer
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>

      {/* Dialog d'édition */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>
          {editingProduct?.id ? 'Modifier produit' : 'Nouveau produit'}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="Nom"
            fullWidth
            margin="normal"
            value={editingProduct?.name || ''}
            onChange={(e) => setEditingProduct(prev => 
              prev ? { ...prev, name: e.target.value } : null
            )}
          />
          <TextField
            label="Prix d'achat"
            type="number"
            fullWidth
            margin="normal"
            value={editingProduct?.buy_price || 0}
            onChange={(e) => setEditingProduct(prev => 
              prev ? { ...prev, buy_price: parseFloat(e.target.value) } : null
            )}
          />
          <TextField
            label="Prix de vente"
            type="number"
            fullWidth
            margin="normal"
            value={editingProduct?.sell_price || 0}
            onChange={(e) => setEditingProduct(prev => 
              prev ? { ...prev, sell_price: parseFloat(e.target.value) } : null
            )}
          />
          <TextField
            label="Stock"
            type="number"
            fullWidth
            margin="normal"
            value={editingProduct?.stock || 0}
            onChange={(e) => setEditingProduct(prev => 
              prev ? { ...prev, stock: parseInt(e.target.value) } : null
            )}
          />
          <TextField
            label="Catégorie"
            select
            fullWidth
            margin="normal"
            value={editingProduct?.category.name || ''}
            onChange={(e) => setEditingProduct(prev => 
              prev ? { ...prev, category: { name: e.target.value } } : null
            )}
          >
            {categories.map(category => (
              <MenuItem key={category} value={category}>
                {category}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Annuler</Button>
          <Button onClick={handleSaveProduct} variant="contained">
            Enregistrer
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}