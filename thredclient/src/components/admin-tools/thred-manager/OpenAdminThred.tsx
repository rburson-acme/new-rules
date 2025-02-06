import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '../../common/Button';
import { observer } from 'mobx-react-lite';
import { AdminThredStore } from '@/src/stores/AdminThredStore';
import { AdminThredsStore } from '@/src/stores/AdminThredsStore';
import { Address } from 'thredlib';
import { ThredEvent } from './ThredEvent';

type OpenAdminThredProps = {
  thredStore: AdminThredStore;
  thredsStore: AdminThredsStore;
};

export const OpenAdminThred = observer(({ thredStore, thredsStore }: OpenAdminThredProps) => {
  const { thred, pattern, events } = thredStore;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ display: 'flex', gap: 8 }}>
        {events.map(event => {
          return <ThredEvent event={event} />;
        })}
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 4 }}>
          <Button content="Terminate Thred" onPress={() => thredStore.terminateThred()} />
          <Button
            content={'Return to Threds'}
            onPress={() => {
              thredsStore.unselectThred();
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
});
