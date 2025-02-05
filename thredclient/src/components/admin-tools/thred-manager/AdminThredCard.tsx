import { AdminThredStore } from '@/src/stores/AdminThredStore';
import { observer } from 'mobx-react-lite';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';

type AdminThredCardProps = {
  thredStore: AdminThredStore;
};

export const AdminThredCard = observer(({ thredStore }: AdminThredCardProps) => {
  const { thred, pattern, events } = thredStore;
  //find the patternReaction with the name of the thred.currentReaction
  
  const currentReaction = pattern?.reactions.find(reaction => reaction.name === thred.currentReaction.reactionName);
  const originalSource = pattern?.reactions[0].allowedSources;

  function getLatestEventTime() {
    const timestamps = events.map(event => event.timestamp);
    const latestEventTime = Math.max(...timestamps);
    const formattedTime = new Date(latestEventTime).toLocaleString();

    return formattedTime;
  }

  return (
    <Pressable style={styles.container} onPress={() => thredStore.rootStore.adminThredsStore.selectThred(thred.id)}>
      <View>
        <Text>{thred.id}</Text>
        <Text>Source: {originalSource}</Text>
        <View>
          <Text>Current State: {currentReaction?.name}</Text>
        </View>
      </View>
      <View>
        <Text>{getLatestEventTime()}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    padding: 8,
    backgroundColor: 'white',
    borderRadius: 8,
    borderColor: 'black',
    borderWidth: 1,
    justifyContent: 'space-between',
    display: 'flex',
    flexDirection: 'row',
    marginHorizontal: 8,
    marginTop: 8,
  },
});
