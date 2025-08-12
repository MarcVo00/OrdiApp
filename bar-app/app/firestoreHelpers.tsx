// firestoreHelpers.ts
import { db } from '../firebase';
import {
  runTransaction, doc, collection, addDoc, serverTimestamp, getDoc
} from 'firebase/firestore';

export async function openOrGetCommande(tableNum: string) {
  const tableRef = doc(db, 'tables', tableNum);

  return await runTransaction(db, async (tx) => {
    const tableSnap = await tx.get(tableRef);
    let openId = tableSnap.exists() ? (tableSnap.data() as any).openCommandeId : null;

    if (openId) {
      // il y a déjà une commande ouverte -> on la renvoie
      const cmdRef = doc(db, 'commandes', openId);
      const cmdSnap = await tx.get(cmdRef);
      if (cmdSnap.exists() && cmdSnap.data().finie === false) {
        return { id: openId, ...cmdSnap.data() };
      } else {
        // incohérence : on répare en ouvrant une nouvelle
        openId = null;
      }
    }

    if (!openId) {
      // créer une nouvelle commande et attacher à la table
      const newCmdRef = await addDoc(collection(db, 'commandes'), {
        table: String(tableNum),
        finie: false,
        createdAt: serverTimestamp(),
        source: 'client_qr', // ou interne_serveur si staff
      });
      tx.set(tableRef, { openCommandeId: newCmdRef.id }, { merge: true });
      const created = await getDoc(newCmdRef); // lecture dans la même transaction = OK
      return { id: newCmdRef.id, ...created.data() };
    }
  });
}

// Clôturer une commande (staff)
export async function closeCommande(tableNum: string, commandeId: string) {
  await runTransaction(db, async (tx) => {
    const tableRef = doc(db, 'tables', tableNum);
    const cmdRef = doc(db, 'commandes', commandeId);

    const cmdSnap = await tx.get(cmdRef);
    if (!cmdSnap.exists()) throw new Error('Commande introuvable');
    if (cmdSnap.data().finie === true) return; // déjà fini

    tx.update(cmdRef, { finie: true, closedAt: serverTimestamp() });

    const tableSnap = await tx.get(tableRef);
    if (tableSnap.exists() && (tableSnap.data() as any).openCommandeId === commandeId) {
      tx.update(tableRef, { openCommandeId: null });
    }
  });
}
