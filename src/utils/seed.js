import { db } from '../firebase';
import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';

export const SAMPLE_THREAD_ID = 'starter_sample_thread';

export const seedTestData = async (uid) => {
  try {
    const batch = writeBatch(db);

    // Use a deterministic document ID so concurrent calls (e.g. React StrictMode) never duplicate the sample thread
    const t1Ref = doc(db, `users/${uid}/chains`, SAMPLE_THREAD_ID);
    
    batch.set(t1Ref, {
      name: "Sleep, Focus & Caffeine",
      isSample: true,
      createdAt: serverTimestamp(),
      variables: [
        { name: 'Sleep', typeId: 'hours', unit: 'hrs' },
        { name: 'Deep Work', typeId: 'hours_foc', unit: 'hrs' },
        { name: 'Caffeine', typeId: 'cups', unit: 'cups' }
      ]
    });

    const today = new Date();
    
    // Realistic 14 days of sample data with natural variance (~ +0.82 correlation)
    const sampleDays = [
      { sleep: 7.5, deepWork: 4.5, cups: 1 },
      { sleep: 6.0, deepWork: 3.8, cups: 3 },
      { sleep: 8.0, deepWork: 5.6, cups: 1 },
      { sleep: 5.5, deepWork: 2.1, cups: 4 },
      { sleep: 7.0, deepWork: 3.6, cups: 2 },
      { sleep: 8.2, deepWork: 5.2, cups: 1 },
      { sleep: 6.5, deepWork: 4.1, cups: 3 },
      { sleep: 7.8, deepWork: 5.5, cups: 2 },
      { sleep: 5.8, deepWork: 2.8, cups: 4 },
      { sleep: 7.2, deepWork: 4.9, cups: 1 },
      { sleep: 8.5, deepWork: 5.8, cups: 1 },
      { sleep: 6.2, deepWork: 2.9, cups: 3 },
      { sleep: 7.6, deepWork: 4.4, cups: 2 },
      { sleep: 6.8, deepWork: 3.7, cups: 2 },
    ];

    sampleDays.forEach((day, idx) => {
      const daysAgo = sampleDays.length - idx;
      const d = new Date(today);
      d.setDate(d.getDate() - daysAgo);
      const dateString = d.toLocaleDateString('en-CA'); // YYYY-MM-DD

      const logDoc = doc(db, `users/${uid}/chains/${SAMPLE_THREAD_ID}/logs`, `sample_log_${idx}`);
      batch.set(logDoc, {
        dateString,
        createdAt: d,
        values: [day.sleep, day.deepWork, day.cups],
        isTestData: true
      });
    });

    await batch.commit();

    return SAMPLE_THREAD_ID;
  } catch (err) {
    console.error("Error seeding data:", err);
    throw err;
  }
};

export const deleteThreadWithLogs = async (uid, chainId) => {
  const batch = writeBatch(db);
  const logsSnap = await getDocs(collection(db, `users/${uid}/chains/${chainId}/logs`));
  logsSnap.forEach((logDoc) => {
    batch.delete(doc(db, `users/${uid}/chains/${chainId}/logs/${logDoc.id}`));
  });
  batch.delete(doc(db, `users/${uid}/chains/${chainId}`));
  await batch.commit();
};
