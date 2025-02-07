import { PatternsList } from '@/src/components/admin-tools/pattern-manager/PatternsList';
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

  return <PatternsList patternsStore={patternsStore} />;
}

export default observer(PatternManager);
