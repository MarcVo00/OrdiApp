# 🍹 OrdiApp – Application de gestion pour bar

**OrdiApp** est une application mobile PWA conçue pour gérer efficacement un bar. Développée avec **React Native (via Expo)** et **Firebase**, elle permet aux clients de passer commande via QR code et au personnel de gérer les commandes, le stock, et les utilisateurs selon leur rôle.

---

## ✨ Fonctionnalités

### 🔐 Authentification par rôle
- **Admin** : accès complet (gestion utilisateurs, produits, stats, etc.)
- **Serveur** : accès à `/serveur` et `/cuisine`
- **Cuisine** : accès uniquement à `/cuisine`

### 📲 Commande client
- Interface accessible via **QR code par table**
- Choix de produits par catégories :
  - **Snacks**, **Desserts**, **Plats principaux**
  - **Cocktails**, **Shots**, **Soft drinks**, **Long drinks**
- Envoi direct de la commande en cuisine

### 🧑‍🍳 Cuisine
- Affichage optimisé tablette
- Vue en temps réel des plats à préparer
- Statuts des commandes (en attente, en cours, terminé)

### 👨‍💼 Serveur
- Liste des tables et commandes
- Interaction avec la cuisine
- Historique de tickets

### 🛠 Admin
- 🔧 Gestion des produits & catégories (CRUD)
- 👥 Création et gestion des utilisateurs
- 📊 Statistiques de ventes (à venir)

---

## 🛠 Stack technique

| Fonction | Technologie |
|----------|-------------|
| Frontend | [Expo + React Native (Web)](https://expo.dev) |
| Authentification | [Firebase Auth](https://firebase.google.com/products/auth) |
| Base de données | [Firebase Firestore](https://firebase.google.com/products/firestore) |
| Hébergement | [Firebase Hosting](https://firebase.google.com/products/hosting) |

---

## 🚀 Démarrer le projet

### 1. Cloner le repo

```bash
git clone https://github.com/votre-utilisateur/OrdiApp.git
cd OrdiApp
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configurer Firebase

Créer un fichier `firebase.ts` :

```ts
// firebase.ts
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: '...',
  authDomain: '...',
  projectId: '...',
  // ...
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
```

### 4. Lancer l'app en mode web

```bash
npx expo start --web
```

---

## 📦 Déploiement PWA

Utilise Firebase Hosting :

```bash
npx expo export --platform web
firebase deploy
```

---

## ✅ Accès par rôle

| Rôle     | Accès autorisé            |
|----------|----------------------------|
| admin    | `/admin`, `/produits`, `/stats`, `/register` |
| serveur  | `/serveur`, `/cuisine`     |
| cuisine  | `/cuisine` uniquement      |

---

## 📄 Licence

Ce projet est open-source et sous licence MIT.
