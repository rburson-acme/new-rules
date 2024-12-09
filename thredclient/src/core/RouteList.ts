import { MaterialIcons } from '@expo/vector-icons';

export type ModuleNames = 'Health Information' | 'Geolocation' | 'Fall/Injury Detection';
export type DevtoolNames = 'Event Editor' | 'Thred Manager' | 'System Event GUI';

export type RouteListItemType<Names> = {
  name: Names;
  description: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
  navigateFn: () => void;
};
