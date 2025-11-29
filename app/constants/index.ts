import { Coach } from '../types';

export const HOURS_CONFIG = {
  MORNING: { start: '10:00', end: '20:00', duration: 10 },
  EVENING: { start: '13:00', end: '23:00', duration: 10 },
  EVENING_EXTENDED: { start: '13:00', end: '01:00', duration: 12 },
};

export const INITIAL_COACHES: Coach[] = [
  { id: 'c1', name: '教练A', color: 'bg-blue-500', avatar: 'A' },
  { id: 'c2', name: '教练B', color: 'bg-emerald-500', avatar: 'B' },
  { id: 'c3', name: '教练C', color: 'bg-purple-500', avatar: 'C' },
  { id: 'c4', name: '教练D', color: 'bg-amber-500', avatar: 'D' },
];
