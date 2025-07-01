import { useTheme } from '@/src/contexts/ThemeContext';
import { ReactNode } from 'react';
import { Pressable, StyleProp, StyleSheet, View, ViewStyle, TextStyle } from 'react-native';
import { MediumText } from './MediumText';

export interface TabItem {
  key: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabKey: string) => void;
  style?: StyleProp<ViewStyle>;
  tabStyle?: StyleProp<ViewStyle>;
  activeTabStyle?: StyleProp<ViewStyle>;
  inactiveTabStyle?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  activeTextStyle?: StyleProp<TextStyle>;
  inactiveTextStyle?: StyleProp<TextStyle>;
  variant?: 'default' | 'compact' | 'pills';
  distribution?: 'equal' | 'content';
}

export const Tabs = ({
  tabs,
  activeTab,
  onTabChange,
  style,
  tabStyle,
  activeTabStyle,
  inactiveTabStyle,
  textStyle,
  activeTextStyle,
  inactiveTextStyle,
  variant = 'default',
  distribution = 'equal',
}: TabsProps) => {
  const { colors } = useTheme();

  const getContainerStyle = () => {
    const baseStyle: StyleProp<ViewStyle>[] = [styles.container];

    if (variant === 'compact') {
      baseStyle.push(styles.compactContainer);
    } else if (variant === 'pills') {
      baseStyle.push(styles.pillsContainer);
    }

    return baseStyle;
  };

  const getTabStyle = (tab: TabItem, isActive: boolean): StyleProp<ViewStyle> => {
    const baseStyles: StyleProp<ViewStyle>[] = [styles.tab];

    if (variant === 'compact') {
      baseStyles.push(styles.compactTab);
    } else if (variant === 'pills') {
      baseStyles.push(styles.pillTab);
    }

    if (distribution === 'equal') {
      baseStyles.push(styles.equalTab);
    }

    // Apply theme colors
    const backgroundColor = isActive ? colors.buttonPrimary : colors.secondaryBackground;
    baseStyles.push({ backgroundColor });

    // Apply custom styles
    if (tabStyle) baseStyles.push(tabStyle);
    if (isActive && activeTabStyle) baseStyles.push(activeTabStyle);
    if (!isActive && inactiveTabStyle) baseStyles.push(inactiveTabStyle);

    // Apply disabled style
    if (tab.disabled) {
      baseStyles.push(styles.disabledTab);
    }

    return baseStyles;
  };

  const getTextStyle = (isActive: boolean, disabled?: boolean): StyleProp<TextStyle> => {
    const baseStyles: StyleProp<TextStyle>[] = [];

    // Apply custom text styles
    if (textStyle) baseStyles.push(textStyle);
    if (isActive && activeTextStyle) baseStyles.push(activeTextStyle);
    if (!isActive && inactiveTextStyle) baseStyles.push(inactiveTextStyle);

    return baseStyles;
  };

  return (
    <View style={[getContainerStyle(), style]}>
      {tabs.map(tab => {
        const isActive = tab.key === activeTab;

        return (
          <Pressable
            key={tab.key}
            style={getTabStyle(tab, isActive)}
            onPress={() => !tab.disabled && onTabChange(tab.key)}
            disabled={tab.disabled}>
            <View style={styles.tabContent}>
              {tab.icon && <View style={styles.iconContainer}>{tab.icon}</View>}
              <MediumText style={getTextStyle(isActive, tab.disabled)}>{tab.label}</MediumText>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
  },
  compactContainer: {
    gap: 8,
  },
  pillsContainer: {
    gap: 12,
    justifyContent: 'center',
  },
  tab: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  equalTab: {
    flex: 1,
  },
  compactTab: {
    padding: 12,
    borderRadius: 6,
  },
  pillTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    marginRight: 8,
  },
  disabledTab: {
    opacity: 0.5,
  },
});
