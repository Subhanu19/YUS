// App.js
import React from 'react';
import AppNavigator from './navigation/AppNavigator';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './context/ThemeContext';
import  WebSocketService from "./services/WebSocketService";
import { useEffect } from "react";
// Ignore errors & warnings only in production
if (!__DEV__) {
  console.error = () => {};
  console.warn = () => {};
}

export default function App() {

  useEffect(() => {
  WebSocketService.init();
}, []);

  return (
    <ThemeProvider>
        <NavigationContainer>
 <AppNavigator />
        </NavigationContainer>
 
    </ThemeProvider>
    
  );
}