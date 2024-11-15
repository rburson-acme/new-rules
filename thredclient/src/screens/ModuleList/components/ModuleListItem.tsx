import { observer } from 'mobx-react-lite';
import { ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { ModuleStackParamList } from '@/src/core/Navigation';
import { RootStore } from '@/src/stores/rootStore';
import { Module } from '@/src/core/Modules';

type ModuleListItemProps = {
  listItem: ListRenderItemInfo<Module>;
  rootStore: RootStore;
};
export const ModuleListItem = observer(({ listItem, rootStore }: ModuleListItemProps) => {
  const navigation = useNavigation<StackNavigationProp<ModuleStackParamList, 'ModuleListLayout', undefined>>();
  return (
    <Pressable
      style={styles.container}
      onPress={() => navigation.navigate('Module', { name: listItem.item.name, rootStore })}>
      <MaterialIcons size={32} name={listItem.item.iconName} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{listItem.item.name}</Text>
        <Text>{listItem.item.description}</Text>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    padding: 12,
    borderColor: '#e0e0e0',
    borderWidth: 0.5,
    gap: 8,
  },
  title: {
    fontSize: 16,
  },
});
