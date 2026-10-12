import { db } from '../firebase';
import { collection, doc, getDocs, writeBatch, serverTimestamp } from 'firebase/firestore';

export const SAMPLE_THREAD_ID = 'starter_sample_thread';

export const seedTestData = async (uid) => {
  try {
    const batch = writeBatch(db);

    // Use a deterministic document ID so concurrent calls (e.g. React StrictMode) never duplicate the sample thread
    const t1Ref = doc(db, `users/${uid}/chains`, SAMPLE_THREAD_ID);
    
    batch.set(t1Ref, {
      name: "Sleep & Coffee",
      isSample: true,
      createdAt: serverTimestamp(),
      variables: [
        { name: 'Sleep', typeId: 'hours', unit: 'hrs' },
        { name: 'Coffee', typeId: 'cups', unit: 'cups' }
      ]
    });

    const today = new Date();
    
    // Realistic 18 days of human tracking with natural variance, real-life outliers, and moderate correlation (~ -0.61)
    const sampleDays = [
      { sleep: 7.8, coffee: 1.0 }, // Good rest, light morning cup
      { sleep: 6.2, coffee: 3.0 }, // Rough night, extra boost
      { sleep: 5.5, coffee: 4.0 }, // Late deadline, heavy caffeine
      { sleep: 6.0, coffee: 2.5 }, // Recovery day
      { sleep: 8.1, coffee: 1.0 }, // Great sleep, 1 cup
      { sleep: 7.2, coffee: 2.0 }, // Standard day
      { sleep: 8.5, coffee: 2.5 }, // Outlier: Slept well, but had social coffee at brunch
      { sleep: 5.8, coffee: 3.5 }, // Monday morning grind
      { sleep: 6.4, coffee: 2.0 }, // Steady day
      { sleep: 7.9, coffee: 0.5 }, // Rest day, light decaf
      { sleep: 5.2, coffee: 1.0 }, // Outlier: Short sleep, but intentional caffeine detox
      { sleep: 6.8, coffee: 3.0 }, // Afternoon slump
      { sleep: 8.0, coffee: 1.5 }, // Well rested
      { sleep: 6.1, coffee: 3.5 }, // High stress day
      { sleep: 7.4, coffee: 2.0 }, // Normal day
      { sleep: 5.9, coffee: 4.0 }, // Big presentation day
      { sleep: 8.3, coffee: 1.0 }, // Weekend catch-up sleep
      { sleep: 7.0, coffee: 2.0 }, // Balanced day
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
        values: [day.sleep, day.coffee],
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
