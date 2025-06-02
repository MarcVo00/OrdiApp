// backend/src/routes/auth.routes.ts
import express from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { generateToken } from '../auth/jwt';

const router = express.Router();
const prisma = new PrismaClient();

router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role
      }
    });
    
    res.status(201).json({ message: 'Utilisateur créé', userId: user.id });
  } catch (error) {
    res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur' });
  }
});

export default router;