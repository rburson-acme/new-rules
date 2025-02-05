import { RootStore } from '@/src/stores/RootStore';
import { observer } from 'mobx-react-lite';
import { View } from 'react-native';
import { ThredsView } from './ThredsView';
import { OpenThredView } from './OpenThredView';

type ThredsLayoutProps = {
  rootStore: RootStore;
};

export const ThredsLayout = observer(({ rootStore }: ThredsLayoutProps) => {
  const { thredsStore } = rootStore;

  const { currentThredStore } = thredsStore;

  if (!currentThredStore) {
    return (
      <View style={{ flex: 1 }}>
        <ThredsView thredsStore={thredsStore} />
      </View>
    );
  } else {
    return <OpenThredView thredStore={currentThredStore} thredsStore={thredsStore} />;
  }
});
