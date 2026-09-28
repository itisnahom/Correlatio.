import { db, auth } from '../firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import { deleteUser, signOut } from 'firebase/auth';

export const exportUserDataCSV = async (uid) => {
  try {
    const chainsSnap = await getDocs(collection(db, `users/${uid}/chains`));
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "ThreadName,Date,Variable,Value,Unit\n";

    for (const chainDoc of chainsSnap.docs) {
      const chainData = chainDoc.data();
      const threadName = chainData.name;
      const variables = chainData.variables || [];
      
      const logsSnap = await getDocs(collection(db, `users/${uid}/chains/${chainDoc.id}/logs`));
      
      logsSnap.docs.forEach(logDoc => {
        const logData = logDoc.data();
        const date = logData.dateString;
        const values = logData.values || [];
        
        variables.forEach((v, index) => {
          const val = values[index];
          if (val !== undefined && val !== null && val !== '') {
            csvContent += `"${threadName}","${date}","${v.name}",${val},"${v.unit || ''}"\n`;
          }
        });
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `correlatio_data_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return true;
  } catch (err) {
    console.error("Export error:", err);
    throw err;
  }
};

export const deleteUserAccount = async (uid) => {
  try {
    // 1. Delete all chains and their logs in fast batches
    const chainsSnap = await getDocs(collection(db, `users/${uid}/chains`));
    const batch = writeBatch(db);

    await Promise.all(chainsSnap.docs.map(async (chainDoc) => {
      const logsSnap = await getDocs(collection(db, `users/${uid}/chains/${chainDoc.id}/logs`));
      logsSnap.docs.forEach((logDoc) => {
        batch.delete(doc(db, `users/${uid}/chains/${chainDoc.id}/logs/${logDoc.id}`));
      });
      batch.delete(doc(db, `users/${uid}/chains/${chainDoc.id}`));
    }));

    batch.delete(doc(db, `users/${uid}`));
    await batch.commit();

    // Clear local onboarding flags so re-registering starts fresh
    localStorage.removeItem(`correlatio_starter_seeded_${uid}`);
    localStorage.removeItem(`correlatio_initialized_${uid}`);
    
    // 2. Delete the user from Auth (or sign out if recent login is required)
    const user = auth.currentUser;
    if (user) {
      try {
        await deleteUser(user);
      } catch {
        await signOut(auth);
      }
    } else {
      await signOut(auth);
    }
    
    return true;
  } catch (err) {
    console.error("Delete account error:", err);
    throw err;
  }
};
