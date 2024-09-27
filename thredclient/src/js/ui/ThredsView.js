
import React from 'react';
import { View } from 'react-native';
import PropTypes from 'prop-types';
import rootStore from '../../ts/store/rootStore';

export const ThredsView = () => {
  const { thredsStore } = rootStore;
  return (
    <View style={styles.container}>
      <ThredView thredsStore={ thredsStore }/>
    </View>
  );
}

ThredsView.propTypes = {
    thredsStore: PropTypes.object
}

const styles = {
  container: {
    flexDirection: 'column',
    flexGrow: 1,
    alignItems: 'stretch',
    justifyContent: 'flex-start',
  },
}