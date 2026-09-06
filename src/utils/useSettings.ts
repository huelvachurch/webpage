import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, onSnapshot } from 'firebase/firestore';

export function useGlobalSettings() {
  const [meetingTime, setMeetingTime] = useState('Domingos a las 18:30h');
  const [hideHuelvaChurchCell, setHideHuelvaChurchCell] = useState(false);
  const [hideRadio, setHideRadio] = useState(false);
  const [hideNewsletter, setHideNewsletter] = useState(false);
  const [gasWebAppUrl, setGasWebAppUrl] = useState<string | null>(null);
  const [driveFolderUrl, setDriveFolderUrl] = useState<string | null>(null);

  useEffect(() => {
    const docRef = doc(db, 'settings', 'general');
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.meetingTime) setMeetingTime(data.meetingTime);
        if (data.hideHuelvaChurchCell !== undefined) setHideHuelvaChurchCell(data.hideHuelvaChurchCell);
        if (data.hideRadio !== undefined) setHideRadio(data.hideRadio);
        if (data.hideNewsletter !== undefined) setHideNewsletter(data.hideNewsletter);
        if (data.gasWebAppUrl) setGasWebAppUrl(data.gasWebAppUrl);
        if (data.driveFolderUrl) setDriveFolderUrl(data.driveFolderUrl);
      }
    }, (err) => {
      console.error("Error listening to general settings:", err);
    });

    return () => unsubscribe();
  }, []);

  return { meetingTime, hideHuelvaChurchCell, hideRadio, hideNewsletter, gasWebAppUrl, driveFolderUrl };
}
