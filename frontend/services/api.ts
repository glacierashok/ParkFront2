import { Platform } from 'react-native';
import { Meetup, RSVP, User, VolunteerLog, Park, VolunteerRole } from '../types';

let currentUserId: string | null = null;

export const setCurrentUserId = (id: string | null) => {
  currentUserId = id;
};

const API_BASE_URL = Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://127.0.0.1:3000';
// const API_BASE_URL = 'https://94hmuk0lx1.execute-api.us-east-2.amazonaws.com/Prod';

const fetchApi = async <T>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers);
  headers.set('Content-Type', 'application/json');
  if (currentUserId) {
    headers.set('X-User-Id', currentUserId);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`API Error ${response.status}: ${text}`);
  }
  // Some endpoints return 204 or empty string
  return (text ? JSON.parse(text) : null) as T;
};

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const loginUser = async (
  provider: 'apple' | 'google',
  email: string = `${provider}user@example.com`,
  name?: string
): Promise<User> => {
  const u = await fetchApi<User>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ provider, email, name })
  });
  currentUserId = u.id;
  return u;
};

export const updateWaiverStatus = async (userId: string): Promise<User> => {
  return await fetchApi<User>(`/users/${userId}/waiver`, {
    method: 'PUT'
  });
};

export const getAllUsers = async (): Promise<User[]> => {
  return await fetchApi<User[]>('/users');
};

export const updateUserRole = async (userId: string, role: string): Promise<User> => {
  return await fetchApi<User>(`/users/${userId}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role })
  });
};

// ─── Parks ───────────────────────────────────────────────────────────────────

export const getAllParks = async (): Promise<Park[]> => {
  return await fetchApi<Park[]>('/parks');
};

export const createPark = async (data: Omit<Park, 'id'> & { id: string }): Promise<Park> => {
  return await fetchApi<Park>('/parks', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const deletePark = async (parkId: string): Promise<void> => {
  return await fetchApi<void>(`/parks/${parkId}`, {
    method: 'DELETE'
  });
};

// ─── Roles ───────────────────────────────────────────────────────────────────

export const getAllRoles = async (): Promise<VolunteerRole[]> => {
  return await fetchApi<VolunteerRole[]>('/roles');
};

export const createRole = async (name: string): Promise<VolunteerRole> => {
  return await fetchApi<VolunteerRole>('/roles', {
    method: 'POST',
    body: JSON.stringify({ name })
  });
};

export const deleteRole = async (roleId: string): Promise<void> => {
  return await fetchApi<void>(`/roles/${roleId}`, {
    method: 'DELETE'
  });
};

// ─── Meetups ─────────────────────────────────────────────────────────────────

export const getUpcomingMeetup = async (): Promise<Meetup | null> => {
  return await fetchApi<Meetup | null>('/meetups/upcoming');
};

export const getAllMeetups = async (): Promise<Meetup[]> => {
  return await fetchApi<Meetup[]>('/meetups');
};

export const createMeetup = async (data: Omit<Meetup, 'id'>): Promise<Meetup> => {
  return await fetchApi<Meetup>('/meetups', {
    method: 'POST',
    body: JSON.stringify(data)
  });
};

export const cancelMeetup = async (meetupId: string): Promise<Meetup> => {
  return await fetchApi<Meetup>(`/meetups/${meetupId}/cancel`, {
    method: 'PATCH'
  });
};

// ─── RSVPs ───────────────────────────────────────────────────────────────────

export const getRSVPsForMeetup = async (meetupId: string): Promise<RSVP[]> => {
  return await fetchApi<RSVP[]>(`/meetups/${meetupId}/rsvps`);
};

export const getUserRSVPs = async (userId: string): Promise<RSVP[]> => {
  return await fetchApi<RSVP[]>(`/users/${userId}/rsvps`);
};

export const upsertRSVP = async (
  meetupId: string,
  userId: string,
  intent: 'going' | 'not_going'
): Promise<RSVP> => {
  return await fetchApi<RSVP>('/rsvps', {
    method: 'POST',
    body: JSON.stringify({ meetup_id: meetupId, user_id: userId, intent })
  });
};

export const markAttendance = async (rsvpId: string, attended: boolean, meetupId: string, userId: string): Promise<RSVP> => {
  return await fetchApi<RSVP>(`/rsvps/${rsvpId}/attendance`, {
    method: 'PATCH',
    body: JSON.stringify({ attended, meetup_id: meetupId, user_id: userId })
  });
};

// ─── Volunteer Logs ──────────────────────────────────────────────────────────

export const getVolunteerLogs = async (userId: string): Promise<VolunteerLog[]> => {
  return await fetchApi<VolunteerLog[]>(`/users/${userId}/volunteer-logs`);
};

export const getPendingVolunteerLogs = async (): Promise<VolunteerLog[]> => {
  return await fetchApi<VolunteerLog[]>('/volunteer-logs/pending');
};

export const approveVolunteerLog = async (logId: string, userId: string): Promise<VolunteerLog> => {
  return await fetchApi<VolunteerLog>(`/volunteer-logs/${logId}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({ user_id: userId })
  });
};

export const rejectVolunteerLog = async (logId: string, userId: string): Promise<VolunteerLog> => {
  return await fetchApi<VolunteerLog>(`/volunteer-logs/${logId}?user_id=${userId}`, {
    method: 'DELETE'
  });
};

export const assignVolunteerRole = async (
  userId: string,
  meetupId: string,
  role: string
): Promise<VolunteerLog> => {
  return await fetchApi<VolunteerLog>('/volunteer-logs', {
    method: 'POST',
    body: JSON.stringify({ user_id: userId, meetup_id: meetupId, assigned_role: role })
  });
};

// ─── Weather ─────────────────────────────────────────────────────────────────

export const getWeatherByTime = async (isoDate: string): Promise<{ temp: number, code: number } | null> => {
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=40.10&longitude=-83.11&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code&temperature_unit=fahrenheit');
    const data = await res.json();

    const targetTime = new Date(isoDate).getTime();
    let closestIdx = 0;
    let minDiff = Infinity;

    data.hourly.time.forEach((t: string, i: number) => {
      const diff = Math.abs(new Date(t + 'Z').getTime() - targetTime);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = i;
      }
    });

    let temp = data.hourly.temperature_2m[closestIdx];
    let code = data.hourly.weather_code[closestIdx];

    return { temp, code };
  } catch (err) {
    console.warn('Failed to fetch weather', err);
    return null;
  }
};
