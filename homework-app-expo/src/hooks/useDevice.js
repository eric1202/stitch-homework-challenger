import { useWindowDimensions } from 'react-native';

export function useDevice() {
  const { width } = useWindowDimensions();
  
  const isLargeScreen = width >= 1024; // iPad Pro and desktop
  const isTablet = width >= 768 && width < 1024;
  const isPhone = width < 768;

  return {
    isLargeScreen,
    isTablet,
    isPhone,
    width
  };
}
