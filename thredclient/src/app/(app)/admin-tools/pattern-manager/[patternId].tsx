import { OpenPattern } from '@/src/components/admin-tools/pattern-manager/OpenPattern';
import { RootStore } from '@/src/stores/RootStore';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';

function Pattern() {
  const navigation = useNavigation();
  const local = useLocalSearchParams();

  const { patternsStore } = RootStore.get();

  const patternStore = patternsStore.patterns.find(patterns => patterns.pattern.id === local.patternId);
  useEffect(() => {
    navigation.setOptions({ title: 'Pattern' });
  }, [navigation]);

  if (!patternStore) return null;
  return <OpenPattern patternStore={patternStore} />;
}

export default observer(Pattern);
