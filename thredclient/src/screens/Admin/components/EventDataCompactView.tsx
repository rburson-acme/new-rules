import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { EventData } from 'thredlib';

type EventDataCompactViewProps = {
  data?: EventData;
  time?: number;
  onPress: () => void;
};

export const EventDataCompactView = ({ data, time, onPress }: EventDataCompactViewProps) => {
  if (!data || !time) {
    return null;
  }
  const { title, description } = data;
  return (
    <TouchableOpacity style={styles.containerStyle} onPress={onPress}>
      <View style={styles.titleContainerStyle}>
        <Text style={styles.textTitleStyle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={styles.textTimeStyle}>{new Date(time).toLocaleTimeString()}</Text>
      </View>
      <Text style={styles.textDescriptionStyle}>{description}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  containerStyle: {
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'stretch',
    flexShrink: 1,
    flexGrow: 1,
  },
  titleContainerStyle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  textTitleStyle: {
    fontSize: 14,
    padding: 1,
    fontWeight: 'bold',
    flexShrink: 1,
  },
  textDescriptionStyle: {
    fontSize: 12,
    padding: 1,
  },
  textTimeStyle: {
    fontSize: 9,
    padding: 1,
    flexShrink: 0,
    color: '#aaaaaf',
  },
});
