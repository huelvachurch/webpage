const fs = require('fs');
let content = fs.readFileSync('src/pages/MiCelula.tsx', 'utf-8');

const academiaState = `
  // --- ACADEMIA (Guide) STATE ---
  const [guidedEnrollments, setGuidedEnrollments] = useState<any[]>([]);
  const [guidedCoursesMap, setGuidedCoursesMap] = useState<Record<string, any>>({});
  const [guidedClassesMap, setGuidedClassesMap] = useState<Record<string, any[]>>({});
  const [expandedEnrollments, setExpandedEnrollments] = useState<string[]>([]);
  const [expandedClasses, setExpandedClasses] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    const qEnrollments = query(
      collection(db, 'enrollments'),
      where('guideId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsub = onSnapshot(qEnrollments, async (snapshot) => {
      const list: any[] = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setGuidedEnrollments(list);

      // Fetch course and classes metadata for guided courses
      const courseIds = Array.from(new Set(list.map(e => e.courseId).filter(Boolean)));
      const coursesObj: Record<string, any> = {};
      const classesObj: Record<string, any[]> = {};

      for (const cid of courseIds) {
        try {
          const cSnap = await getDoc(doc(db, 'courses', cid));
          if (cSnap.exists()) {
            coursesObj[cid] = { id: cSnap.id, ...cSnap.data() };
            const qClasses = query(collection(db, 'courses', cid, 'classes'), orderBy('order', 'asc'));
            const classSnaps = await getDocs(qClasses);
            const cl: any[] = [];
            classSnaps.forEach(cd => cl.push({ id: cd.id, ...cd.data() }));
            classesObj[cid] = cl;
          }
        } catch (err) {
          console.error(err);
        }
      }
      setGuidedCoursesMap(coursesObj);
      setGuidedClassesMap(classesObj);
    });

    return () => unsub();
  }, [user]);

  const toggleEnrollment = (id: string) => {
    setExpandedEnrollments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleClass = (enrollmentId: string, classId: string) => {
    const key = \`\${enrollmentId}-\${classId}\`;
    setExpandedClasses(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  };
  // --- END ACADEMIA STATE ---
`;

content = content.replace(
  /  if \(loading\) \{/,
  academiaState + '\n  if (loading) {'
);

fs.writeFileSync('src/pages/MiCelula.tsx', content);
