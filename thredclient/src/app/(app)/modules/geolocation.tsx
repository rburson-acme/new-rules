import { Button } from '@/src/components/common/Button';
import { RegularText } from '@/src/components/common/RegularText';
import { Spinner } from '@/src/components/common/Spinner';
import { RootStore } from '@/src/stores/RootStore';
import { useNavigation } from 'expo-router';
import { observer } from 'mobx-react-lite';
import { useEffect } from 'react';
import { Text, View } from 'react-native';

function GeoModule() {
  const { geoModuleStore } = RootStore.get();
  const { hasInitialized, location, errorMessage, turnOnLocation, canAskAgain } = geoModuleStore;
  useEffect(() => {
    geoModuleStore.initialize();
  }, []);

  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: 'Geolocation' });
  }, [navigation]);

  if (!hasInitialized) {
    return <Spinner />;
  }
  return (
    <View style={{ paddingHorizontal: 8, paddingTop: 8, gap: 4 }}>
      {location ? (
        <RegularText>{JSON.stringify(location)}</RegularText>
      ) : (
        <View>
          {errorMessage && <RegularText style={{ textAlign: 'center' }}>{errorMessage}</RegularText>}
          {canAskAgain && <Button content={'Request All Permissions'} onPress={turnOnLocation} />}
        </View>
      )}
    </View>
  );
}

export default observer(GeoModule);
