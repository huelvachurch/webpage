const fs = require('fs');
let content = fs.readFileSync('src/pages/CursoDetalle.tsx', 'utf-8');

content = content.replace(
  /import \{\s*ArrowLeft, BookOpen, Clock, Calendar, CheckCircle, ChevronRight, Lock,\s*Menu, Download, Award, AlertCircle, HelpCircle, GraduationCap, ArrowRight,\s*RefreshCw, Check, FileText, Send, ShieldCheck\s*\} from 'lucide-react';/,
  "import { ArrowLeft, BookOpen, Clock, Calendar, CheckCircle, ChevronRight, Lock, Menu, Download, Award, AlertCircle, HelpCircle, GraduationCap, ArrowRight, RefreshCw, Check, FileText, Send, ShieldCheck, MessageSquare } from 'lucide-react';"
);

fs.writeFileSync('src/pages/CursoDetalle.tsx', content);
