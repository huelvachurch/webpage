import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

export function useGlobalSettings() {
  const [meetingTime, setMeetingTime] = useState('Domingos a las 18:30h');
  const [newsletterLogoUrl, setNewsletterLogoUrl] = useState('');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const snap = await getDoc(docRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.meetingTime) setMeetingTime(data.meetingTime);
          if (data.newsletterLogoUrl) setNewsletterLogoUrl(data.newsletterLogoUrl);
        }
      } catch (err) {
        console.error("Error fetching general settings", err);
      }
    };
    fetchSettings();
  }, []);

  return { meetingTime, newsletterLogoUrl };
}
