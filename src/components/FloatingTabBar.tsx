import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useTranslation } from 'react-i18next';
import { F } from "../theme/fonts";
import { SHADOW } from "../theme/colors";
import { useTheme } from "../contexts/ThemeContext";

export const FloatingTabBar: React.FC<BottomTabBarProps> = ({
  state,
  descriptors,
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { colors } = useTheme();

  const getTabLabel = (routeName: string): string => {
    const map: Record<string, string> = {
      Trips:     t('tabs.trips'),
      Bookings:  t('tabs.bookings'),
      Addresses: t('tabs.addresses'),
      Ideas:     t('tabs.ideas'),
      Profile:   t('tabs.profile'),
    };
    return map[routeName] ?? routeName;
  };

  // One animated value per tab to drive the pip opacity/scale
  const pipAnimations = React.useRef(
    state.routes.map((_, i) => new Animated.Value(i === state.index ? 1 : 0)),
  ).current;

  React.useEffect(() => {
    state.routes.forEach((_, i) => {
      Animated.spring(pipAnimations[i], {
        toValue: i === state.index ? 1 : 0,
        useNativeDriver: true,
        damping: 15,
        stiffness: 200,
      }).start();
    });
  }, [state.index]);

  const getIconName = (routeName: string, focused: boolean) => {
    const iconMap: Record<string, { focused: string; unfocused: string }> = {
      Trips:     { focused: 'airplane',     unfocused: 'airplane-outline' },
      Bookings:  { focused: 'calendar',     unfocused: 'calendar-outline' },
      Addresses: { focused: 'location',     unfocused: 'location-outline' },
      Ideas:     { focused: 'bulb',         unfocused: 'bulb-outline' },
      Profile:   { focused: 'person',       unfocused: 'person-outline' },
    };
    const icons = iconMap[routeName] ?? { focused: 'help', unfocused: 'help-outline' };
    return focused ? icons.focused : icons.unfocused;
  };

  const bottomGap = Math.max(insets.bottom, 12);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.outer, { paddingBottom: bottomGap }]}
    >
      <View
        style={[
          styles.island,
          {
            backgroundColor: colors.surface,
            borderColor: colors.borderLight,
            shadowColor: SHADOW.medium.shadowColor,
          },
        ]}
      >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        const onLongPress = () => {
          navigation.emit({ type: 'tabLongPress', target: route.key });
        };

        const iconName = getIconName(
          route.name,
          isFocused,
        ) as keyof typeof Ionicons.glyphMap;

        const pipScale = pipAnimations[index].interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
        });

        return (
          <TouchableOpacity
            key={route.key}
            accessibilityRole="button"
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={(options as { tabBarTestID?: string }).tabBarTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={styles.tabButton}
            activeOpacity={0.7}
          >
            {/* Terra pip above icon */}
            <Animated.View
              style={[
                styles.pip,
                {
                  backgroundColor: colors.terra,
                  opacity: pipAnimations[index],
                  transform: [{ scaleX: pipScale }],
                },
              ]}
            />

            <Ionicons
              name={iconName}
              size={28}
              color={isFocused ? colors.terra : colors.textLight}
            />

            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              style={[styles.label, { color: isFocused ? colors.terra : colors.textLight }, isFocused && styles.labelActive]}
            >
              {getTabLabel(route.name)}
            </Text>
          </TouchableOpacity>
        );
      })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'transparent',
  },
  island: {
    flexDirection: 'row',
    borderRadius: 28,
    paddingTop: 14,
    paddingBottom: 10,
    paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 4,
    gap: 2,
  },
  pip: {
    position: 'absolute',
    top: -6,
    width: 16,
    height: 2.5,
    borderRadius: 999,
  },
  label: {
    fontSize: 12,
    fontFamily: F.sans500,
    marginTop: 2,
  },
  labelActive: {
    fontFamily: F.sans600,
  },
});
