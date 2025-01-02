import 'react-native-gesture-handler';
import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';
import { LoginScreen } from './src/screens/Login/LoginScreen';
import { Layout } from './src/screens/Layout';
import { NavigationContainer } from '@react-navigation/native';

export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaView style={styles.container}>
        <Layout />
      </SafeAreaView>
    </NavigationContainer>
  );

  //Test bypass
  /*
  return (
    <View style={styles.container}>
      <MessageLayout rootStore={ rootStore }/>
    </View>
  );
  */
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
});
