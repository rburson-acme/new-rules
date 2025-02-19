import { FontAwesome } from '@expo/vector-icons';

export type ModuleNames = 'Health Information' | 'Geolocation' | 'Fall/Injury Detection';
export type AdminToolNames = 'Event Editor' | 'Thred Manager' | 'Pattern Manager';

export type RouteListItemType<Names> = {
  name: Names;
  description: string;
  iconName: keyof typeof FontAwesome.glyphMap;
  navigateFn: () => void;
};
