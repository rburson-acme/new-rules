import React from 'react';
import { View } from 'react-native';
import { Layout } from './src/js/ui/Layout';
import { MessageLayout } from './src/js/ui/message/MessageLayout';
import rootStore from './src/ts/store/rootStore';
import './initApp';

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