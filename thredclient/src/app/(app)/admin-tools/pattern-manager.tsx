import { PatternsList } from '@/src/components/admin-tools/pattern-manager/PatternsList';
import { OpenPattern } from '@/src/components/admin-tools/pattern-manager/OpenPattern';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';

function PatternManager() {
  const navigation = useNavigation();

  const { patternsStore } = RootStore.get();

  useEffect(() => {
    navigation.setOptions({ title: 'Pattern Manager' });
  }, [navigation]);

  const getPatterns = async () => {
    await patternsStore.getAllPatterns();
  };
  useEffect(() => {
    getPatterns();
  }, []);

  if (!patternsStore.currentPatternStore) {
    return <PatternsList patternsStore={patternsStore} />;
  } else return <OpenPattern patternStore={patternsStore.currentPatternStore} />;
}

export default observer(PatternManager);
