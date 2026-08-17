import { db } from '../firebase';
import { collection, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';

export const seedTestData = async (uid) => {
  try {
    // Create a 3-variable thread
    const threadRef = await addDoc(collection(db, `users/${uid}/chains`), {
      name: "Productivity Ecosystem",
      createdAt: serverTimestamp(),
      variables: [
        { name: 'Deep Work', typeId: 'hours', icon: '🧠', unit: 'hrs' },
        { name: 'Caffeine', typeId: 'cups', icon: '☕', unit: 'cups' },
        { name: 'Sleep Score', typeId: 'score', icon: '😴', unit: 'pts' }
      ]
    });

    const threadId = threadRef.id;

    // Generate 14 days of mock data
    const today = new Date();
    for (let i = 14; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateString = d.toLocaleDateString('en-CA'); // YYYY-MM-DD

      // Make up some correlated data
      // More caffeine = less sleep score, more deep work (up to a point)
      const cups = Math.floor(Math.random() * 5); // 0 to 4
      const sleepBase = 90 - (cups * 10) + (Math.random() * 10 - 5);
      
      let deepWork;
      if (cups === 0) deepWork = 2 + Math.random();
      else if (cups <= 2) deepWork = 4 + Math.random() * 2;
      else deepWork = 3 + Math.random(); // Too much caffeine crashes focus

      await addDoc(collection(db, `users/${uid}/chains/${threadId}/logs`), {
        dateString,
        createdAt: d,
        values: [parseFloat(deepWork.toFixed(1)), cups, Math.round(sleepBase)]
      });
    }

    alert('Successfully seeded "Productivity Ecosystem" with 14 days of data! Refresh the page to see it.');
    window.location.reload();
  } catch (err) {
    console.error("Error seeding data:", err);
    alert('Failed to seed data. Check console.');
  }
};
