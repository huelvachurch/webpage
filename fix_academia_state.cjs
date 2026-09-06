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
      const list = [];
      snapshot.forEach(doc => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setGuidedEnrollments(list);

      // Fetch course and classes metadata for guided courses
      const courseIds = Array.from(new Set(list.map(e => e.courseId).filter(Boolean)));
      const coursesObj = {};
      const classesObj = {};

      for (const cid of courseIds) {
        try {
          const cSnap = await getDoc(doc(db, 'courses', cid));
          if (cSnap.exists()) {
            coursesObj[cid] = { id: cSnap.id, ...cSnap.data() };
            const qClasses = query(collection(db, 'courses', cid, 'classes'), orderBy('order', 'asc'));
            const classSnaps = await getDocs(qClasses);
            const cl = [];
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

  const toggleEnrollment = (id) => {
    setExpandedEnrollments(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleClass = (enrollmentId, classId) => {
    const key = \`\${enrollmentId}-\${classId}\`;
    setExpandedClasses(prev => prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key]);
  };
  // --- END ACADEMIA STATE ---
`;

if (!content.includes('guidedEnrollments')) {
    // If it does not include it at all (wait it does because of JSX)
    // we should replace \`if (!isAuthReady || loading) {\` with \`academiaState + '\\n  if (!isAuthReady || loading) {'\`
}
content = content.replace(
  /  if \(\!isAuthReady \|\| loading\) \{/,
  academiaState + '\n  if (!isAuthReady || loading) {'
);

fs.writeFileSync('src/pages/MiCelula.tsx', content);
