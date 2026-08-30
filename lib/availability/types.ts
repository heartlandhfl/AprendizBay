export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface AvailabilitySlot {
  weekday: Weekday;
  startTime: string;
  endTime: string;
}

export interface TutorAvailability {
  slots: AvailabilitySlot[];
}
