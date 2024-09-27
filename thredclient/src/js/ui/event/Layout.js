import React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { EventsLayout } from './EventsLayout';
import { ThredHeader } from './ThredHeader';

export const Layout = ({ rootStore }) => {
  return (
    <View style={styles.container}>
      <ThredHeader rootStore={rootStore} />
      <EventsLayout rootStore={rootStore}/>
    </View>
  );
}

Layout.propTypes = {
  rootStore: PropTypes.any
}


const styles = {
  container: {
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
};