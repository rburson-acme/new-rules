import { observer } from 'mobx-react-lite';
import { Animated, StyleSheet, View } from 'react-native';
import { Button } from '@/src/components/Button';
import { Event, Validator } from 'thredlib';
import { ThredsStore } from '@/src/stores/ThredsStore';
import { DEFAULT_EVENT_JSON_STRING } from '@/src/constants/DefaultEventString';
import { EventEditorLocals } from './EventEditor';

type ButtonGroupProps = {
  localStore: EventEditorLocals;
  shakeAnim: Animated.Value;
  thredsStore: ThredsStore;
};
export const ButtonGroup = observer(({ localStore, shakeAnim, thredsStore }: ButtonGroupProps) => {
  function onSend() {
    thredsStore.publish(JSON.parse(localStore.text));
    localStore.setText('');
  }

  function onQueue() {
    try {
      localStore.queue.push(JSON.parse(localStore.text));
      localStore.setText('');
      localStore.setIsTextRed(false);
    } catch (e) {
      alert('Invalid JSON');
    }
  }

  function onSendNextQueued() {
    const json = localStore.queue.shift();
    if (json) {
      localStore.setText(JSON.stringify(json, null, 2));
    } else queueError();
  }

  function onFormatJSON() {
    try {
      localStore.setText(JSON.stringify(JSON.parse(localStore.text), null, 2));
    } catch (e) {
      alert('Invalid JSON');
    }
  }

  function onDisplayEventOutput() {
    try {
      const validator = new Validator();
      const data = JSON.parse(localStore.text);
      const isDataValid = validator.isDataValid(data, 'event');
      if (!isDataValid) {
        alert('Invalid Event');
        return;
      }
      const event = data as Event;

      if (event.data?.advice?.template) {
        localStore.setTemplate(event.data.advice.template);
      } else {
        alert('Event does not have advice template');
      }
    } catch (e) {
      console.log(e);
      alert('Invalid JSON');
      return;
    }
  }

  function onLoadDefaultEvent() {
    localStore.setText(DEFAULT_EVENT_JSON_STRING);
  }

  const queueError = () => {
    // Define the shake animation
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    localStore.setIsTextRed(true);
  };

  return (
    <View style={styles.buttonContainer}>
      <Button content="Send" onPress={onSend} />
      <Button content="Queue" onPress={onQueue} />
      <Button content="Load up next queued" onPress={onSendNextQueued} />
      <Button content="Load Default Event" onPress={onLoadDefaultEvent} />
      <Button content="Format JSON" onPress={onFormatJSON} />
      <Button content="Display Event Output" onPress={onDisplayEventOutput} />
    </View>
  );
});

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    padding: 8,
  },
});
