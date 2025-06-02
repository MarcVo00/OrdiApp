import express from 'express';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';

const prisma = new PrismaClient();
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Route test
app.get('/api', (req, res) => {
  res.json({ message: "API du bar opérationnelle!" });
});

// Démarrer le serveur
app.listen(PORT, () => {
  console.log(`Serveur backend sur http://localhost:${PORT}`);
});