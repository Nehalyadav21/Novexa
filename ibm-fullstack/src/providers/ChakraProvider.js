'use client';

import { ChakraProvider, ColorModeScript } from '@chakra-ui/react';

// Simple theme for Chakra UI v3
const theme = {
  config: {
    initialColorMode: 'light',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      50: '#E3F2F9',
      100: '#C5E4F3',
      200: '#A2D2EC',
      300: '#7CC1E4',
      400: '#47A9DA',
      500: '#0078D4',
      600: '#106EBE',
      700: '#005A9E',
      800: '#004578',
      900: '#003054',
    },
  },
};

export function CustomChakraProvider({ children }) {
  return (
    <>
      <ColorModeScript initialColorMode={theme.config.initialColorMode} />
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </>
  );
}
