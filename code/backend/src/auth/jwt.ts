// backend/src/auth/jwt.ts
import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'votre_super_secret_secure';

declare global {
    namespace Express {
        interface Request {
        user?: { id: number; role: string };
        }
    }
    }

export const generateToken = (userId: number, role: string) => {
  return jwt.sign({ id: userId, role }, JWT_SECRET, {
    expiresIn: '8h' // Durée de validité
  });
};

export const authenticate = (roles: string[]) => { 
  return (req: Request, res: Response, next: NextFunction) : void => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      res.status(401).json({ error: 'Token manquant' });
    }
    else {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
          res.status(401).json({ error: 'Token invalide' });
        } else {
          req.user = { id: (decoded as any).id, role: (decoded as any).role };
          
          // Vérifier le rôle de l'utilisateur
          if (roles.length && !roles.includes(req.user.role)) {
            res.status(403).json({ error: 'Accès refusé' });
          } else {
            next();
          }
        }
      });
    }
    }
}