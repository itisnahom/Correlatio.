import { db } from '../firebase';
import { collection, doc, writeBatch, serverTimestamp } from 'firebase/firestore';

export const seedTestData = async (uid) => {
  try {
    const batch = writeBatch(db);

    // ----------------------------------------------------
    // Thread 1: 3-Variable Continuous Data
    // ----------------------------------------------------
    const chainsRef = collection(db, `users/${uid}/chains`);
    const t1Ref = doc(chainsRef);
    
    batch.set(t1Ref, {
      name: "Productivity Ecosystem",
      createdAt: serverTimestamp(),
      variables: [
        { name: 'Deep Work', typeId: 'hours', icon: '🧠', unit: 'hrs' },
        { name: 'Caffeine', typeId: 'cups', icon: '☕', unit: 'cups' },
        { name: 'Sleep Score', typeId: 'score', icon: '😴', unit: '%' }
      ]
    });

    const today = new Date();
    
    // Generate 14 days of mock data for Thread 1
    const logsRef = collection(db, `users/${uid}/chains/${t1Ref.id}/logs`);
    for (let i = 14; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('en-CA'); // YYYY-MM-DD

      const cups = Math.floor(Math.random() * 5); // 0 to 4
      const sleepBase = 90 - (cups * 10) + (Math.random() * 10 - 5);
      
      let deepWork;
      if (cups === 0) deepWork = 2 + Math.random();
      else if (cups <= 2) deepWork = 4 + Math.random() * 2;
      else deepWork = 3 + Math.random(); 

      const logDoc = doc(logsRef);
      batch.set(logDoc, {
        dateString,
        createdAt: d,
        values: [parseFloat(deepWork.toFixed(1)), cups, Math.round(sleepBase)],
        isTestData: true
      });
    }

    // Commit all writes at once
    await batch.commit();

    return true;
  } catch (err) {
    console.error("Error seeding data:", err);
    throw err;
  }
};
