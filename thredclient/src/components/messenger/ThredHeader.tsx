import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { RootStore } from '@/src/stores/rootStore';
import { Menu } from '../common/Menu';

const logo = require('../../../assets/workthreds_logo.png');

type ThredHeaderProps = {
  rootStore: RootStore;
};
export const ThredHeader = ({ rootStore }: ThredHeaderProps) => {
  const { authStore } = rootStore;
  return (
    <View style={styles.containerStyle}>
      <Image source={logo} style={styles.logoStyle} />
      {
        // Need to align this correctly
        // <Text style={ { ...textStyle }  }>{`${authStore.name}`}</Text>
      }
      <Menu />
    </View>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f1f1',
    height: 50,
    paddingTop: 3,
    paddingRight: 5,
    paddingBottom: 3,
    paddingLeft: 10,
  },
  textStyle: {
    fontSize: 13,
    paddingLeft: 20,
    color: 'black',
  },
  logoStyle: {
    width: 200,
    resizeMode: 'contain',
    margin: 0,
    padding: 0,
  },
});
