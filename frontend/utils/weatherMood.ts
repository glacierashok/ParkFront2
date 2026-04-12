/**
 * utils/weatherMood.ts
 * Utility to map Open-Meteo weather codes and temperature to 8 distinct atmospheric moods and asset paths.
 */

export type WeatherMood = 'muggy' | 'crisp' | 'brisk' | 'freeze' | 'fog' | 'drizzle' | 'washout' | 'snow';

export const weatherMoodImages: Record<WeatherMood, any> = {
  muggy: require('../assets/weather/muggy.png'),
  crisp: require('../assets/weather/crisp.png'),
  brisk: require('../assets/weather/brisk.png'),
  freeze: require('../assets/weather/freeze.png'),
  fog: require('../assets/weather/fog.png'),
  drizzle: require('../assets/weather/drizzle.png'),
  washout: require('../assets/weather/washout.png'),
  snow: require('../assets/weather/snow.png'),
};

/**
 * Derives the exact background mood asset key given the live WMO code and temperature.
 * Evaluates conditions in priority order: Snow -> Heavy Rain -> Light Rain -> Fog -> Temps.
 */
export function getWeatherMood(code: number, temperatureF: number): WeatherMood {
  // 1. Check for Snow 
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return 'snow';
  }

  // 2. Heavy Rain / Washout 
  if (code === 65 || code === 67 || code === 82 || code >= 95) {
    return 'washout';
  }

  // 3. Light Rain / Drizzle 
  if ((code >= 51 && code <= 66) || code === 80 || code === 81) {
    return 'drizzle';
  }

  // 4. Fog / Mist 
  if (code === 45 || code === 48) {
    return 'fog';
  }

  // 5. Temperature Buckets
  if (temperatureF < 32) return 'freeze';
  if (temperatureF < 50) return 'brisk';
  if (temperatureF < 70) return 'crisp';
  
  return 'muggy'; // >= 70
}

export function getWeatherBackgroundImage(weather?: { code: number; temp: number } | null) {
  const activeMood = weather ? getWeatherMood(weather.code, weather.temp) : 'crisp';
  return weatherMoodImages[activeMood];
}
