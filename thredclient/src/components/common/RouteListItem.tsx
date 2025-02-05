import { ListRenderItemInfo, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { RootStore } from '@/src/stores/RootStore';
import { RouteListItemType } from '@/src/core/RouteList';

type ModuleListItemProps<Names> = {
  listItem: ListRenderItemInfo<RouteListItemType<Names>>;
  rootStore: RootStore;
};
export function RouteListItem<Names extends string>({ listItem, rootStore }: ModuleListItemProps<Names>) {
  return (
    <Pressable style={styles.container} onPress={listItem.item.navigateFn}>
      <MaterialIcons size={32} name={listItem.item.iconName} />
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{listItem.item.name}</Text>
        <Text>{listItem.item.description}</Text>
      </View>
    </Pressable>
  );
}

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
