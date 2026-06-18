import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useGlobalSettings() {
  const [meetingTime, setMeetingTime] = useState('Domingos a las 18:30h');
  const [hideHuelvaChurchCell, setHideHuelvaChurchCell] = useState(false);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'general');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.meetingTime) setMeetingTime(data.meetingTime);
        if (data.hideHuelvaChurchCell !== undefined) setHideHuelvaChurchCell(data.hideHuelvaChurchCell);
      }
    }, (err) => {
      console.error("Error listening to general settings:", err);
    });

    return () => unsubscribe();
  }, []);

  return { meetingTime, hideHuelvaChurchCell };
}
