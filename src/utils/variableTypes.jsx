import React from 'react';
import { 
  Clock, CheckCircle2, Coffee, Star, BookOpen, CheckSquare, Timer, Footprints, 
  DollarSign, Apple, Droplet, Dumbbell, Percent, Target, Hash, Scale, Route, 
  Brain, Moon, Smartphone, Pencil 
} from 'lucide-react';

const iconProps = { size: 20, strokeWidth: 1.5 };

export const VARIABLE_TYPES = [
  { id: 'hours',     icon: <Clock {...iconProps} />,        label: 'Hours',      unit: 'hrs',     placeholder: 'e.g. Hours of sleep' },
  { id: 'boolean',   icon: <CheckCircle2 {...iconProps} />, label: 'Yes/No',     unit: 'bool',    placeholder: 'e.g. Meditated?' },
  { id: 'cups',      icon: <Coffee {...iconProps} />,       label: 'Cups',       unit: 'cups',    placeholder: 'e.g. Cups of coffee' },
  { id: 'rating',    icon: <Star {...iconProps} />,         label: 'Rating',     unit: '/10',     placeholder: 'e.g. Mood rating' },
  { id: 'pages',     icon: <BookOpen {...iconProps} />,     label: 'Pages',      unit: 'pages',   placeholder: 'e.g. Pages read' },
  { id: 'tasks',     icon: <CheckSquare {...iconProps} />,  label: 'Tasks',      unit: 'tasks',   placeholder: 'e.g. Tasks completed' },
  { id: 'minutes',   icon: <Timer {...iconProps} />,        label: 'Minutes',    unit: 'min',     placeholder: 'e.g. Meditation time' },
  { id: 'steps',     icon: <Footprints {...iconProps} />,   label: 'Steps',      unit: 'k steps', placeholder: 'e.g. Steps walked' },
  { id: 'dollars',   icon: <DollarSign {...iconProps} />,   label: 'Money',      unit: '$',       placeholder: 'e.g. Money spent' },
  { id: 'calories',  icon: <Apple {...iconProps} />,        label: 'Calories',   unit: 'kcal',    placeholder: 'e.g. Calories eaten' },
  { id: 'glasses',   icon: <Droplet {...iconProps} />,      label: 'Glasses',    unit: 'glasses', placeholder: 'e.g. Glasses of water' },
  { id: 'workouts',  icon: <Dumbbell {...iconProps} />,     label: 'Sessions',   unit: 'sessions',placeholder: 'e.g. Workout sessions' },
  { id: 'percent',   icon: <Percent {...iconProps} />,      label: 'Percent',    unit: '%',       placeholder: 'e.g. Battery level' },
  { id: 'score',     icon: <Target {...iconProps} />,       label: 'Score',      unit: '%',       placeholder: 'e.g. Test score' },
  { id: 'count',     icon: <Hash {...iconProps} />,         label: 'Count',      unit: 'times',   placeholder: 'e.g. Times checked phone' },
  { id: 'weight',    icon: <Scale {...iconProps} />,        label: 'Weight',     unit: 'kg',      placeholder: 'e.g. Body weight' },
  { id: 'km',        icon: <Route {...iconProps} />,        label: 'Distance',   unit: 'km',      placeholder: 'e.g. Distance run' },
  { id: 'hours_foc', icon: <Brain {...iconProps} />,        label: 'Focus',      unit: 'hrs',     placeholder: 'e.g. Deep focus hours' },
  { id: 'sleep_q',   icon: <Moon {...iconProps} />,         label: 'Sleep Qual', unit: '/10',     placeholder: 'e.g. Sleep quality' },
  { id: 'social',    icon: <Smartphone {...iconProps} />,   label: 'Screen',     unit: 'hrs',     placeholder: 'e.g. Social media time' },
  { id: 'custom',    icon: <Pencil {...iconProps} />,       label: 'Custom',     unit: '',        placeholder: 'Name your variable' },
];

export const getVarType = (id) => VARIABLE_TYPES.find(v => v.id === id) ?? VARIABLE_TYPES[VARIABLE_TYPES.length - 1];
