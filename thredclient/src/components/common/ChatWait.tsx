import React from 'react';
import { observer } from 'mobx-react-lite';
import * as Animatable from 'react-native-animatable';
import { Text } from 'react-native';

type ChatWaitProps = {
  containerStyle: object;
  textStyle?: object;
  isVisible: () => boolean;
};

export const ChatWait = observer(({ containerStyle, textStyle, isVisible }: ChatWaitProps) => {
  return isVisible && isVisible() ? (
    <Animatable.View
      style={[styles.containerStyle, containerStyle]}
      animation="rubberBand"
      duration={1000}
      easing={'ease-in'}
      iterationCount={'infinite'}
      useNativeDriver={true}>
      <Text style={{ ...styles.textStyle, ...textStyle }}>...</Text>
    </Animatable.View>
  ) : null;
});

const styles = {
  containerStyle: {
    marginTop: 15,
    paddingBottom: 5,
    paddingLeft: 12,
    paddingRight: 12,
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    backgroundColor: '#f3f3f3',
  },
  textStyle: {
    fontSize: 30,
  },
};
