
export interface Stream {
  id: string;
  name: string;
  code: string; // 'C', 'D', 'A', 'O'
}

export interface Subject {
  id: string;
  name: string;
  icon: string;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}

export interface Lesson {
  id: string;
  title: string;
  duration: string;
  isCompleted?: boolean;
}

export const STREAMS: Stream[] = [
  { id: 'serie-c', name: 'Mathematics (Série C)', code: 'C' },
  { id: 'serie-d', name: 'Natural Sciences (Série D)', code: 'D' },
  { id: 'serie-a', name: 'Modern Letters (Série A)', code: 'A' },
  { id: 'serie-o', name: 'Original Letters (Série O)', code: 'O' },
];

export const SUBJECTS: Subject[] = [
  { id: 'math', name: 'Mathematics', icon: 'Calculator' },
  { id: 'phys', name: 'Physics & Chemistry', icon: 'Atom' },
  { id: 'sn', name: 'Natural Sciences', icon: 'Dna' },
  { id: 'ar', name: 'Arabic', icon: 'BookOpen' },
  { id: 'fr', name: 'French', icon: 'Languages' },
  { id: 'phil', name: 'Philosophy', icon: 'Brain' },
  { id: 'eng', name: 'English', icon: 'Globe' },
];

export const MOCK_MATH_CURRICULUM: Chapter[] = [
  {
    id: 'ch1',
    title: 'Complex Numbers',
    lessons: [
      { id: 'l1', title: 'Algebraic Form', duration: '15 min', isCompleted: true },
      { id: 'l2', title: 'Trigonometric Form', duration: '20 min', isCompleted: true },
      { id: 'l3', title: 'Exponential Notation', duration: '10 min' },
      { id: 'l4', title: 'Solving Equations', duration: '25 min' },
    ]
  },
  {
    id: 'ch2',
    title: 'Analysis & Functions',
    lessons: [
      { id: 'l5', title: 'Limits and Continuity', duration: '20 min' },
      { id: 'l6', title: 'Differentiation', duration: '30 min' },
      { id: 'l7', title: 'Integration', duration: '35 min' },
    ]
  },
  {
    id: 'ch3',
    title: 'Probability',
    lessons: [
      { id: 'l8', title: 'Combinatorics', duration: '15 min' },
      { id: 'l9', title: 'Conditional Probability', duration: '20 min' },
    ]
  }
];
