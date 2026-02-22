import React from 'react';
import { View, Text, StyleSheet, Image, Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRewards } from '@/contexts/RewardsContext';
import { router } from 'expo-router';

interface CoinHeaderProps {
  title?: string;
  subtitle?: string;
  rightElement?: React.ReactNode;
  transparent?: boolean;
}

export default function CoinHeader({ title, subtitle, rightElement, transparent }: CoinHeaderProps) {
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const { state } = useRewards();

  return (
    <View style={[styles.container, { paddingTop: topInset + 8 }, transparent && styles.transparent]}>
      <Pressable onPress={() => router.push('/(tabs)/index')} style={styles.leftSection}>
        <Image source={require('@/assets/images/logo.jpeg')} style={styles.logo} />
        {title ? (
          <View style={styles.titleWrap}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
          </View>
        ) : (
          <Text style={styles.brandName}>Good Money</Text>
        )}
      </Pressable>

      <View style={styles.rightSection}>
        <Pressable onPress={() => router.push('/(tabs)/index')} style={styles.coinPill}>
          <View style={styles.coinIcon}>
            <Ionicons name="star" size={12} color="#0C1B2A" />
          </View>
          <Text style={styles.coinCount}>{state.points.toLocaleString()}</Text>
        </Pressable>
        {rightElement}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0C1B2A',
  },
  transparent: {
    backgroundColor: 'transparent',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  logo: {
    width: 34,
    height: 34,
    borderRadius: 10,
  },
  brandName: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 18,
    color: '#fff',
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 17,
    color: '#fff',
  },
  subtitle: {
    fontFamily: 'DMSans_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(212,175,55,0.15)',
    borderRadius: 20,
    paddingLeft: 4,
    paddingRight: 10,
    paddingVertical: 5,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.25)',
  },
  coinIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinCount: {
    fontFamily: 'DMSans_700Bold',
    fontSize: 13,
    color: '#D4AF37',
  },
});
