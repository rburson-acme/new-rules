import React, { useRef } from 'react';
import { StyleSheet, View, Animated, ScrollView } from 'react-native';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Event, TemplateModel } from 'thredlib';
import { DEFAULT_EVENT_JSON_STRING } from '@/src/constants/DefaultEventString';
import { EventInput } from './EventInput';
import { EventOutput } from './EventOutput';
import { ButtonGroup } from './ButtonGroup';
import { Queue } from './Queue';
import { RootStore } from '@/src/stores/rootStore';
import { TemplateStore } from '@/src/stores/TemplateStore';

export type EventEditorLocals = {
  text: string;
  setText(value: string): void;
  queue: Event[];
  isTextRed: boolean;
  setIsTextRed(value: boolean): void;
  templateStore: TemplateStore | null;
  setTemplateStore(value: TemplateModel): void;
};

type EventEditorProps = { rootStore: RootStore };
// TODO: We need to figure out a better way to handle this typeConfig
// ...either figure out this, or make a more rigid interactionModel so this is not needed.

// ComponentTree will give all sorts of nasty errors that might crash the app
//if we don't give types to some of these interaction pieces

export const EventEditor = observer(({ rootStore }: EventEditorProps) => {
  const { thredsStore } = rootStore;

  const localStore = useLocalObservable<EventEditorLocals>(() => ({
    text: DEFAULT_EVENT_JSON_STRING,
    setText(value: string) {
      this.text = value;
    },
    queue: [],
    isTextRed: false,
    setIsTextRed(value: boolean) {
      this.isTextRed = value;
    },
    templateStore: null,
    setTemplateStore(value: TemplateModel) {
      this.templateStore = new TemplateStore(value);
    },
  }));

  const shakeAnim = useRef(new Animated.Value(0)).current;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={{ flexDirection: 'row', gap: 24 }}>
        <EventInput localStore={localStore} />
        <EventOutput localStore={localStore} />
      </View>
      <ButtonGroup localStore={localStore} shakeAnim={shakeAnim} thredsStore={thredsStore} />
      <Queue localStore={localStore} shakeAnim={shakeAnim} />
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    flexGrow: 1,
    backgroundColor: '#ffffff',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 16,
  },
});
