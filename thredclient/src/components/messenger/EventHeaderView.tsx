import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EventData, Event } from 'thredlib';
import { TextBubble } from '@/src/components/common/TextBubble';

type EventHeaderViewProps = {
  data: EventData;
  source: Event['source'];
  type: string;
};
export const EventHeaderView = ({ data, source, type }: EventHeaderViewProps) => {
  const { title, description } = data;

  return (
    <View style={styles.container}>
      {title && description ? <TextBubble titleText={title} text={description} /> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 10,
  },
});
