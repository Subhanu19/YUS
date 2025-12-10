// App.js
import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './context/ThemeContext';

// Ignore errors & warnings only in production
if (!__DEV__) {
  console.error = () => {};
  console.warn = () => {};
}

export default function App() {
  return (
    <ThemeProvider>
        <NavigationContainer>
 <AppNavigator />
        </NavigationContainer>
 
    </ThemeProvider>
    
  );
}
