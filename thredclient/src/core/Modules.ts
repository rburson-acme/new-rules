import { MaterialIcons } from "@expo/vector-icons";

export type ModuleNames = 'Health Information' | 'Geolocation' | 'Fall/Injury Detection';
export type Module = {
  name: ModuleNames;
  description: string;
  iconName: keyof typeof MaterialIcons.glyphMap;
};