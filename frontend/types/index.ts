export interface User {
  id: string;
  full_name: string;
  email: string;
  provider: 'apple' | 'google';
  role: 'neighbor' | 'volunteer' | 'admin';
  waiver_accepted: boolean;
  waiver_timestamp: string | null;
}

export interface Park {
  id: string;
  name: string;
  location: string;
  trail?: string;
  latitude?: number;
  longitude?: number;
}

export interface Meetup {
  id: string;
  scheduled_time: string;
  status: 'active' | 'canceled';
  weather_note: string;
  park_id?: string;
  // Fallbacks for older meetups
  latitude?: number;
  longitude?: number;
}

export interface RSVP {
  id: string;
  meetup_id: string;
  user_id: string;
  user_full_name?: string;
  intent: 'going' | 'not_going';
  attended: boolean;
}

export interface VolunteerLog {
  id: string;
  user_id: string;
  meetup_id: string;
  assigned_role: string;
  hours_credited: number;
  status: 'pending' | 'verified';
}

export interface VolunteerRole {
  id: string;
  name: string;
}
