export type Operation = 'greater-than' | 'less-than' | 'equals';
type Unit = 'cumecs' | 'metres';
export type Type = 'flow' | 'stage_height';

export type ContactPreferences = {
  email: string;
  includeEmail: boolean;
};

export type Threshold = {
  operation: Operation;
  value: number;
  units: 'cumecs' | 'metres';
};

export type Observable = {
  units: Unit;
  latest_value: number;
  type: Type;
};

export type Gauge = {
  name: string;
  id: string;
  observables: Observable[];
};

export type AlertData = {
  name: string;
  description: string;
  active: boolean;
  contactPreferences: ContactPreferences;
  threshold: Threshold;
  gauge: Gauge;
};

export interface Alert extends AlertData {
  id: string;
};
