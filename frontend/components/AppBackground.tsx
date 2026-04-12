import React from 'react';
import { ImageBackground, StyleSheet, View, useWindowDimensions } from 'react-native';
import { colors } from '../constants/theme';
import { getWeatherBackgroundImage } from '../utils/weatherMood';

interface AppBackgroundProps {
  weather: { temp: number; code: number } | null;
  children: React.ReactNode;
}

export default function AppBackground({ weather, children }: AppBackgroundProps) {
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const bgSource = getWeatherBackgroundImage(weather);

  return (
    <View style={styles.container}>
      <ImageBackground 
        source={bgSource} 
        style={[StyleSheet.absoluteFillObject, { width: screenWidth, height: screenHeight }]} 
        resizeMode="cover" 
      />
      <View style={styles.overlay} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
});
