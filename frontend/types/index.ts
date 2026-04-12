export interface User {
  id: string;
  full_name: string;
  email: string;
  provider: 'apple' | 'google';
  role: 'neighbor' | 'volunteer' | 'admin';
  waiver_accepted: boolean;
  waiver_timestamp: string | null;
}

export interface Meetup {
  id: string;
  scheduled_time: string;
  location: string;
  status: 'active' | 'canceled';
  weather_note: string;
}

export interface RSVP {
  id: string;
  meetup_id: string;
  user_id: string;
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
