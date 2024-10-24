import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Layout } from './src/screens/Login/LoginScreen';
import './initApp';

export default function App() {
  return (
    <View style={styles.container}>
      <Layout />
    </View>
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
