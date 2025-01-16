import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, ScrollView, Dimensions } from 'react-native';
import { observer, useLocalObservable } from 'mobx-react-lite';
import { Event, TemplateModel } from 'thredlib';
import { DEFAULT_EVENT_JSON_STRING } from '@/src/constants/DefaultEventString';
import { RootStore } from '@/src/stores/rootStore';
import { TemplateStore } from '@/src/stores/TemplateStore';
import { EventInput } from '@/src/components/devtools/EventInput';
import { EventOutput } from '@/src/components/devtools/EventOutput';
import { ButtonGroup } from '@/src/components/devtools/ButtonGroup';
import { Queue } from '@/src/components/devtools/Queue';
import { useNavigation } from 'expo-router';

export type EventEditorLocals = {
  text: string;
  setText(value: string): void;
  queue: Event[];
  isTextRed: boolean;
  setIsTextRed(value: boolean): void;
  templateStore: TemplateStore | null;
  setTemplateStore(value: TemplateModel): void;
};

function EventEditor() {
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Event Editor' });
  }, [navigation]);

  const rootStore = RootStore.get();
  const { thredsStore } = rootStore;
  const windowWidth = Dimensions.get('window').width;

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

  const shouldUseVerticalScreen = windowWidth < 800;
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={shouldUseVerticalScreen ? { gap: 8 } : { flexDirection: 'row', gap: 24 }}>
        <EventInput localStore={localStore} />
        <EventOutput localStore={localStore} />
      </View>
      <ButtonGroup localStore={localStore} shakeAnim={shakeAnim} thredsStore={thredsStore} />
      <Queue localStore={localStore} shakeAnim={shakeAnim} />
    </ScrollView>
  );
}

export default observer(EventEditor);

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
