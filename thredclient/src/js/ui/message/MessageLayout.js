import React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import { EventsLayout } from './EventsLayout';
import { ThredHeader } from './ThredHeader';

export const MessageLayout = ({rootStore}) => {

  // @TODO - add 'ThredPanel' and determine selected thred here
  // For now use the first ThredStore


  return (
    <View style={styles.container}>
      <ThredHeader rootStore={rootStore} />
      <EventsLayout rootStore={rootStore}/>
    </View>
  );
}

MessageLayout.propTypes = {
  rootStore: PropTypes.object
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