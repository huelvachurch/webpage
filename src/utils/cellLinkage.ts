import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export interface CellLinkageResult {
  isLinked: boolean;
  cellId?: string;
  cellName?: string;
  isLeader?: boolean;
}

export async function checkUserCellLinkage(uid: string): Promise<CellLinkageResult> {
  if (!uid) return { isLinked: false };

  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (userSnap.exists()) {
      const data = userSnap.data();
      if (data.celulaId) {
        let cellName = 'Mi Célula';
        try {
          const cSnap = await getDoc(doc(db, 'celulas', data.celulaId));
          if (cSnap.exists()) {
            cellName = cSnap.data().name || cellName;
          }
        } catch {}
        return { isLinked: true, cellId: data.celulaId, cellName };
      }
    }

    // Check if leader of a cell
    const qLeader = query(collection(db, 'celulas'), where('leaderId', '==', uid));
    const leaderSnap = await getDocs(qLeader);
    if (!leaderSnap.empty) {
      const docData = leaderSnap.docs[0].data();
      return {
        isLinked: true,
        cellId: leaderSnap.docs[0].id,
        cellName: docData.name || 'Mi Célula',
        isLeader: true
      };
    }

    // Check if co-leader of a cell
    const qCoLeader = query(collection(db, 'celulas'), where('coLeaderId', '==', uid));
    const coLeaderSnap = await getDocs(qCoLeader);
    if (!coLeaderSnap.empty) {
      const docData = coLeaderSnap.docs[0].data();
      return {
        isLinked: true,
        cellId: coLeaderSnap.docs[0].id,
        cellName: docData.name || 'Mi Célula'
      };
    }

    // Check cell_members collection
    const qMembers = query(collection(db, 'cell_members'), where('userId', '==', uid));
    const membersSnap = await getDocs(qMembers);
    if (!membersSnap.empty) {
      const memberData = membersSnap.docs[0].data();
      return {
        isLinked: true,
        cellId: memberData.cellId,
        cellName: memberData.cellName || 'Mi Célula'
      };
    }
  } catch (err) {
    console.error("Error checking user cell linkage:", err);
  }

  return { isLinked: false };
}
