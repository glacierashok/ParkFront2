import { Ionicons } from '@expo/vector-icons';

export type WeatherIconName = React.ComponentProps<typeof Ionicons>['name'];

export type WeatherInfo = {
  condition: string;
  bg: string;
  icon: WeatherIconName;
};

export const getWeatherInfo = (code: number): WeatherInfo => {
  if (code === 0) return { condition: 'Clear', bg: '#FF9F0A88', icon: 'sunny-outline' };
  if (code === 1) return { condition: 'Partly Cloudy', bg: '#FF9F0A88', icon: 'partly-sunny-outline' };
  if (code === 2) return { condition: 'Partly Cloudy', bg: '#8796A588', icon: 'partly-sunny-outline' };
  if (code === 3) return { condition: 'Overcast', bg: '#8796A588', icon: 'cloudy-outline' };
  if (code === 45 || code === 48) return { condition: 'Foggy', bg: '#8796A588', icon: 'cloudy-outline' };
  if (code >= 51 && code <= 67) return { condition: 'Rainy', bg: '#4A658388', icon: 'rainy-outline' };
  if (code >= 71 && code <= 77) return { condition: 'Snowy', bg: '#91B9D588', icon: 'snow-outline' };
  if (code >= 80 && code <= 82) return { condition: 'Rain Showers', bg: '#364B6188', icon: 'rainy-outline' };
  if (code >= 95) return { condition: 'Thunderstorm', bg: '#364B6188', icon: 'thunderstorm-outline' };

  return { condition: 'Clear', bg: '#4CA1AF88', icon: 'partly-sunny-outline' };
};
