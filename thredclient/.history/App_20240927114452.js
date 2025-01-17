import React from 'react';
import { View } from 'react-native';
import { Layout } from './app/js/ui/Layout';
import { MessageLayout } from './app/js/ui/message/MessageLayout';
import rootStore from './app/ts/store/rootStore';
import './initApp';a

export default function App() {
  return (
    <View style={styles.container}>
      <Layout/>
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

const styles = {
  container: {
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: '#fff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
};