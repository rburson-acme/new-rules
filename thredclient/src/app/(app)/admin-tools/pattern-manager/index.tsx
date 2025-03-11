import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import { PatternsView } from '@/src/components/admin-tools/pattern-manager/PatternsView';

function PatternManagerList() {
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

  return <PatternsView patternsStore={patternsStore} />;
}

export default observer(PatternManagerList);
