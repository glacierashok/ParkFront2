import { Linking, Platform } from 'react-native';

export const openDirections = (parkName: string, location?: string, latitude?: number, longitude?: number) => {
  const destQuery = (latitude !== undefined && longitude !== undefined)
    ? `${latitude},${longitude}`
    : encodeURIComponent(`${parkName} ${location || ''}`.trim());

  if (Platform.OS === 'ios') {
    Linking.openURL(`http://maps.apple.com/?daddr=${destQuery}`);
  } else {
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${destQuery}`);
  }
};
