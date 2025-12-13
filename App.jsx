// App.js
import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './context/ThemeContext';
import { initWS } from "./services/WebSocketService";
import { useEffect } from "react";
// Ignore errors & warnings only in production
if (!__DEV__) {
  console.error = () => {};
  console.warn = () => {};
}

export default function App() {

  useEffect(() => {
    initWS(null);
  }, []);

  return (
    <ThemeProvider>
        <NavigationContainer>
 <AppNavigator />
        </NavigationContainer>
 
    </ThemeProvider>
    
  );
}