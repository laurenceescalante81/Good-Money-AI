import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, Dimensions, TextInput, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useRewards, Mission, TokenTransaction } from '@/contexts/RewardsContext';
import { MessageOverlay } from '@/contexts/AppMessagesContext';
import Colors from '@/constants/colors';
import CoinHeader from '@/components/CoinHeader';
import { useAccessibility } from '@/contexts/AccessibilityContext';

const { width: SCREEN_W } = Dimensions.get('window');
const fmt = (n: number) => '$' + n.toLocaleString('en-AU', { maximumFractionDigits: 0 });

type TabKey = 'hub' | 'missions' | 'badges' | 'redeem' | 'wallet';

function SpinWheel() {
  const { fs, is } = useAccessibility();
  const { canSpin, spinWheel, spinResetTime } = useRewards();
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const rotation = useSharedValue(0);
  const SEGMENTS = [
    { label: '25', color: '#6366F1' },
    { label: '75', color: '#8B5CF6' },
    { label: '150', color: '#A855F7' },
    { label: '300', color: '#7C3AED' },
    { label: '50', color: '#6D28D9' },
    { label: '200', color: '#5B21B6' },
    { label: '100', color: '#4C1D95' },
    { label: '500', color: '#581C87' },
  ];

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handleSpin = useCallback(() => {
    if (!canSpin || spinning) return;
    setSpinning(true);
    setPrize(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const won = spinWheel();
    const extraSpins = 1440 + Math.random() * 720;
    rotation.value = withTiming(rotation.value + extraSpins, { duration: 4000, easing: Easing.bezier(0.25, 0.1, 0.25, 1) }, () => {
      runOnJS(setSpinning)(false);
      runOnJS(setPrize)(won);
      runOnJS(Haptics.notificationAsync)(Haptics.NotificationFeedbackType.Success);
    });
  }, [canSpin, spinning, spinWheel, rotation]);

  return (
    <View style={s.spinSection}>
      <View style={s.spinHeader}>
        <View style={s.spinTitleRow}>
          <Ionicons name="sync" size={is(16)} color={Colors.light.super} />
          <Text style={[s.spinLabel, { fontSize: fs(11) }]}>DAILY SPIN</Text>
        </View>
        <View style={s.spinResetBadge}>
          <Text style={[s.spinResetLabel, { fontSize: fs(9) }]}>RESETS IN</Text>
          <Text style={[s.spinResetTime, { fontSize: fs(14) }]}>{spinResetTime}</Text>
        </View>
      </View>
      <Text style={[s.spinTitle, { fontSize: fs(20) }]}>Spin for bonus Good Coins</Text>
      <Text style={[s.spinSub, { fontSize: fs(13) }]}>1 free spin per day — up to 500 coins</Text>

      <View style={s.wheelContainer}>
        <Animated.View style={[s.wheel, wheelStyle]}>
          {SEGMENTS.map((seg, i) => {
            const angle = (i * 360) / SEGMENTS.length;
            return (
              <View key={i} style={[s.wheelSegment, { transform: [{ rotate: `${angle}deg` }] }]}>
                <View style={[s.segmentInner, { backgroundColor: seg.color }]}>
                  <Text style={[s.segmentText, { fontSize: fs(10) }]}>{seg.label}</Text>
                </View>
              </View>
            );
          })}
          <View style={s.wheelCenter}>
            <Ionicons name="gift" size={is(20)} color="#fff" />
          </View>
        </Animated.View>
        <View style={s.wheelPointer}>
          <Ionicons name="caret-down" size={is(24)} color={Colors.light.super} />
        </View>
      </View>

      {prize !== null && (
        <View style={s.prizeResult}>
          <Text style={[s.prizeText, { fontSize: fs(22) }]}>+{prize} coins earned!</Text>
        </View>
      )}

      <Pressable
        onPress={handleSpin}
        disabled={!canSpin || spinning}
        style={({ pressed }) => [s.spinBtn, (!canSpin || spinning) && s.spinBtnDisabled, pressed && { opacity: 0.85 }]}
      >
        <Text style={[s.spinBtnText, { fontSize: fs(16) }]}>{spinning ? 'Spinning...' : canSpin ? 'SPIN' : 'Come back tomorrow'}</Text>
      </Pressable>
    </View>
  );
}

function ScratchCard() {
  const { fs, is } = useAccessibility();
  const { canScratch, scratchCard } = useRewards();
  const [revealed, setRevealed] = useState(false);
  const [prize, setPrize] = useState(0);
  const scale = useSharedValue(1);

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handleScratch = () => {
    if (revealed || !canScratch) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    const won = scratchCard();
    setPrize(won);
    scale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1.05, { damping: 8 }),
      withTiming(1, { duration: 200 })
    );
    setRevealed(true);
  };

  return (
    <View style={s.scratchSection}>
      <View style={s.scratchHeaderRow}>
        <View style={s.scratchTitleRow}>
          <Ionicons name="ticket" size={is(16)} color={Colors.light.tint} />
          <Text style={[s.scratchLabel, { fontSize: fs(11) }]}>WEEKLY SCRATCH</Text>
        </View>
        <View style={s.scratchNewBadge}>
          <Text style={[s.scratchNewText, { fontSize: fs(10) }]}>NEW</Text>
        </View>
      </View>
      <Text style={[s.scratchTitle, { fontSize: fs(20) }]}>Scratch for a bonus reward</Text>
      <Text style={[s.scratchSub, { fontSize: fs(13) }]}>1 card available this week</Text>

      <Pressable onPress={handleScratch} disabled={revealed || !canScratch}>
        <Animated.View style={[s.scratchCardBody, cardStyle]}>
          <LinearGradient
            colors={revealed ? [Colors.light.tint, Colors.light.tintDark] : [Colors.light.navy, Colors.light.navyMid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.scratchCardGradient}
          >
            {!revealed ? (
              <>
                <View style={s.scratchIconWrap}>
                  <Ionicons name="gift" size={is(32)} color="#D4AF37" />
                </View>
                <Text style={[s.scratchTapText, { fontSize: fs(16) }]}>Tap to Scratch</Text>
                <Text style={[s.scratchTapSub, { fontSize: fs(12) }]}>PP Bonus Card</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={is(36)} color="#fff" />
                <Text style={[s.scratchPrizeText, { fontSize: fs(32) }]}>+{prize} coins</Text>
                <Text style={[s.scratchWonText, { fontSize: fs(14) }]}>Bonus coins added!</Text>
              </>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function MissionItem({ mission }: { mission: Mission }) {
  const { fs, is } = useAccessibility();
  const now = Date.now();
  const remaining = Math.max(0, mission.expiresAt - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const expiryText = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  const effectivePts = mission.is2xActive ? mission.basePoints * 2 : mission.basePoints;

  return (
    <View style={[s.missionItem, mission.completed && s.missionCompleted]}>
      <View style={[s.missionIcon, { backgroundColor: mission.iconBg + '15' }]}>
        <Ionicons name={mission.icon as any} size={is(22)} color={mission.iconBg} />
      </View>
      <View style={s.missionInfo}>
        <Text style={[s.missionTitle, { fontSize: fs(15) }, mission.completed && s.missionTitleDone]}>{mission.title}</Text>
        <Text style={[s.missionDesc, { fontSize: fs(12) }]}>{mission.description}</Text>
        {!mission.completed && (
          <View style={s.missionExpiryRow}>
            <Ionicons name="hourglass-outline" size={is(12)} color={Colors.light.amber} />
            <Text style={[s.missionExpiry, { fontSize: fs(11) }]}>Expires in {expiryText}</Text>
          </View>
        )}
      </View>
      <View style={s.missionPtsCol}>
        {mission.is2xActive && (
          <>
            <Text style={[s.missionOldPts, { fontSize: fs(12) }]}>+{mission.basePoints}</Text>
            <View style={s.mission2xBadge}>
              <Text style={[s.mission2xText, { fontSize: fs(9) }]}>2x ACTIVE</Text>
            </View>
          </>
        )}
        <Text style={[s.missionPts, { fontSize: fs(18) }, mission.completed && { color: Colors.light.gray400 }]}>
          {mission.completed ? 'Done' : `+${effectivePts}`}
        </Text>
        {!mission.completed && !mission.is2xActive && <Text style={[s.missionPtsSuffix, { fontSize: fs(11) }]}>coins</Text>}
      </View>
    </View>
  );
}

function BadgeItem({ badge }: { badge: { id: string; title: string; description: string; icon: string; color: string; unlocked: boolean } }) {
  const { fs, is } = useAccessibility();
  return (
    <View style={[s.badgeItem, !badge.unlocked && s.badgeLocked]}>
      <View style={[s.badgeIconWrap, { backgroundColor: badge.unlocked ? badge.color + '15' : Colors.light.gray100 }]}>
        <Ionicons name={badge.icon as any} size={is(24)} color={badge.unlocked ? badge.color : Colors.light.gray400} />
      </View>
      <Text style={[s.badgeName, { fontSize: fs(12) }, !badge.unlocked && s.badgeNameLocked]}>{badge.title}</Text>
      <Text style={[s.badgeDesc, { fontSize: fs(10) }]}>{badge.description}</Text>
      {badge.unlocked && <Ionicons name="checkmark-circle" size={is(16)} color={Colors.light.income} style={s.badgeCheck} />}
    </View>
  );
}

export default function RewardsScreen() {
  const { fs, is } = useAccessibility();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'web' ? 67 : insets.top;
  const { state, missions, badges, rewards, checkIn, redeemReward, convertPointsToTokens, getFactFindProgress, canSpin, canScratch, is2xWeekend, xpForLevel, TOKEN_RATE } = useRewards();
  const [activeTab, setActiveTab] = useState<TabKey>('hub');
  const [checkedIn, setCheckedIn] = useState(false);
  const [convertAmount, setConvertAmount] = useState('');

  useEffect(() => {
    const earned = checkIn();
    if (earned > 0) setCheckedIn(true);
  }, []);

  const levelNames = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Elite', 'Legend', 'Mythic', 'Champion', 'Grand Master'];
  const levelName = levelNames[Math.min(state.level - 1, levelNames.length - 1)];
  const xpNeeded = xpForLevel(state.level);
  const xpPct = xpNeeded > 0 ? Math.min((state.xp / xpNeeded) * 100, 100) : 0;
  const coinValue = (state.points / 100).toFixed(2);

  const completedMissions = missions.filter(m => m.completed).length;
  const unlockedBadges = badges.filter(b => b.unlocked).length;

  const handleRedeem = (id: string, title: string, cost: number) => {
    if (state.points < cost) {
      Alert.alert('Not enough coins', `You need ${cost - state.points} more Good Coins to redeem ${title}.`);
      return;
    }
    Alert.alert('Redeem Reward', `Spend ${cost} Good Coins for ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Redeem', onPress: () => {
        const ok = redeemReward(id);
        if (ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert('Redeemed!', `${title} has been added to your benefits.`);
        }
      }},
    ]);
  };

  const handleConvert = () => {
    const pts = parseInt(convertAmount);
    if (isNaN(pts) || pts < TOKEN_RATE) {
      Alert.alert('Minimum Conversion', `You need at least ${TOKEN_RATE} Good Coins to convert to 1 Good Coin token.`);
      return;
    }
    if (pts > state.points) {
      Alert.alert('Not Enough Coins', `You only have ${state.points.toLocaleString()} Good Coins available.`);
      return;
    }
    const tokens = Math.floor(pts / TOKEN_RATE);
    Alert.alert('Convert to Good Coins', `Convert ${tokens * TOKEN_RATE} Good Coins into ${tokens} Good Coin tokens?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Convert', onPress: () => {
        const ok = convertPointsToTokens(pts); 
        if (ok) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setConvertAmount('');
        }
      }},
    ]);
  };

  const tabs: { key: TabKey; label: string; icon: string }[] = [
    { key: 'hub', label: 'Hub', icon: 'home-outline' },
    { key: 'wallet', label: 'Wallet', icon: 'wallet-outline' },
    { key: 'missions', label: 'Missions', icon: 'flag-outline' },
    { key: 'badges', label: 'Badges', icon: 'ribbon-outline' },
    { key: 'redeem', label: 'Redeem', icon: 'gift-outline' },
  ];

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <CoinHeader title="Rewards" subtitle="EARN & REDEEM" />

        <View style={s.heroCard}>
          <LinearGradient colors={[Colors.light.navy, Colors.light.navyMid]} style={s.heroGradient}>
            <View style={s.pointsTopRow}>
              <View>
                <Text style={[s.pointsLabel, { fontSize: fs(11) }]}>GOOD COINS</Text>
                <Text style={[s.pointsBig, { fontSize: fs(36) }]}>{state.points.toLocaleString()}<Text style={[s.pointsSuffix, { fontSize: fs(18) }]}> coins</Text></Text>
                <Text style={[s.pointsCash, { fontSize: fs(13) }]}>{'\u2248'} ${coinValue} cash value</Text>
                {(state.tokenBalance ?? 0) > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: fs(7), fontFamily: 'DMSans_700Bold' as const, color: '#0C1B2A' }}>pp</Text>
                    </View>
                    <Text style={{ fontSize: fs(12), fontFamily: 'DMSans_600SemiBold' as const, color: '#D4AF37' }}>{(state.tokenBalance ?? 0).toFixed(2)} Good Coins</Text>
                  </View>
                )}
              </View>
              <View style={s.levelBadge}>
                <Text style={[s.levelBadgeLabel, { fontSize: fs(9) }]}>LEVEL</Text>
                <Text style={[s.levelBadgeNum, { fontSize: fs(24) }]}>{state.level}</Text>
                <Text style={[s.levelBadgeName, { fontSize: fs(10) }]}>{levelName}</Text>
              </View>
            </View>

            {is2xWeekend && (
              <View style={s.weekendBadge}>
                <Ionicons name="flash" size={is(12)} color="#D4AF37" />
                <Text style={[s.weekendBadgeText, { fontSize: fs(11) }]}>2x Weekend</Text>
              </View>
            )}

            <View style={s.xpRow}>
              <Text style={[s.xpLabel, { fontSize: fs(12) }]}>Lv {state.level} {'\u2192'} Lv {state.level + 1}</Text>
              <Text style={[s.xpNums, { fontSize: fs(12) }]}>{state.xp.toLocaleString()} / {xpNeeded.toLocaleString()} XP</Text>
            </View>
            <View style={s.xpBarBg}>
              <LinearGradient colors={[Colors.light.tint, Colors.light.tintLight]} style={[s.xpBarFill, { width: `${xpPct}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
            </View>
            <Text style={[s.xpRemaining, { fontSize: fs(11) }]}>{(xpNeeded - state.xp).toLocaleString()} XP to next level</Text>

            <View style={s.statsRow}>
              <View style={s.statItem}>
                <Text style={[s.statLabel, { fontSize: fs(10) }]}>MISSIONS</Text>
                <Text style={[s.statValue, { fontSize: fs(18) }]}>{completedMissions}/{missions.length}</Text>
              </View>
              <View style={s.statDivider} />
              <View style={s.statItem}>
                <Text style={[s.statLabel, { fontSize: fs(10) }]}>BADGES</Text>
                <Text style={[s.statValue, { fontSize: fs(18) }]}>{unlockedBadges}/{badges.length}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        <View style={s.tabBar}>
          {tabs.map(tab => (
            <Pressable
              key={tab.key}
              onPress={() => { setActiveTab(tab.key); Haptics.selectionAsync(); }}
              style={[s.tabItem, activeTab === tab.key && s.tabItemActive]}
            >
              <Ionicons name={tab.icon as any} size={is(16)} color={activeTab === tab.key ? Colors.light.tint : Colors.light.gray400} />
              <Text style={[s.tabText, { fontSize: fs(13) }, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
            </Pressable>
          ))}
        </View>

        <View style={s.body}>
          {activeTab === 'hub' && (
            <>
              <Pressable style={s.factFindCard} onPress={() => router.push('/(tabs)/fact-find' as any)}>
                <LinearGradient colors={[Colors.light.tint, Colors.light.tintDark]} style={s.factFindGradient}>
                  <View style={s.factFindRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="search" size={is(14)} color="#D4AF37" />
                        <Text style={[s.factFindLabel, { fontSize: fs(10) }]}>FINANCIAL FACT FIND</Text>
                      </View>
                      <Text style={[s.factFindTitle, { fontSize: fs(16) }]}>Complete your profile & earn Good Coins</Text>
                      <Text style={[s.factFindSub, { fontSize: fs(12) }]}>Enter your details to unlock comparisons & switch requests</Text>
                    </View>
                    <View style={s.factFindProgress}>
                      <Text style={[s.factFindPct, { fontSize: fs(18) }]}>{getFactFindProgress().percentage}%</Text>
                      <View style={s.factFindBarBg}>
                        <View style={[s.factFindBarFill, { width: `${getFactFindProgress().percentage}%` }]} />
                      </View>
                    </View>
                  </View>
                  <View style={s.factFindCoinsRow}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#D4930D' }}><Text style={{ fontSize: fs(8), fontWeight: '800', color: '#7C5800' }}>$</Text></View>
                    <Text style={[s.factFindCoinsText, { fontSize: fs(12) }]}>Earn up to 5,450 Good Coins</Text>
                    <Ionicons name="chevron-forward" size={is(16)} color="rgba(255,255,255,0.6)" />
                  </View>
                </LinearGradient>
              </Pressable>

              {is2xWeekend && (
                <View style={s.promoCard}>
                  <Ionicons name="flash" size={is(18)} color="#D4AF37" />
                  <View style={s.promoInfo}>
                    <Text style={[s.promoTitle, { fontSize: fs(13) }]}>2x COINS WEEKEND</Text>
                    <Text style={[s.promoDesc, { fontSize: fs(13) }]}>All missions earn double this weekend</Text>
                    <Text style={[s.promoExpiry, { fontSize: fs(11) }]}>Ends Sunday at midnight</Text>
                  </View>
                  <Text style={[s.promo2x, { fontSize: fs(28) }]}>2x</Text>
                </View>
              )}

              <SpinWheel />
              <ScratchCard />
            </>
          )}

          {activeTab === 'missions' && (
            <>
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { fontSize: fs(18) }]}>Active Missions</Text>
              </View>
              {missions.filter(m => !m.completed).map(m => <MissionItem key={m.id} mission={m} />)}
              {missions.filter(m => m.completed).length > 0 && (
                <>
                  <Text style={[s.sectionTitle, { marginTop: 24, fontSize: fs(18) }]}>Completed</Text>
                  {missions.filter(m => m.completed).map(m => <MissionItem key={m.id} mission={m} />)}
                </>
              )}
            </>
          )}

          {activeTab === 'badges' && (
            <>
              <Text style={[s.sectionTitle, { fontSize: fs(18) }]}>Your Badges</Text>
              <Text style={[s.badgesSubtitle, { fontSize: fs(13) }]}>{unlockedBadges} of {badges.length} unlocked</Text>
              <View style={s.badgesGrid}>
                {badges.map(b => <BadgeItem key={b.id} badge={b} />)}
              </View>
            </>
          )}

          {activeTab === 'wallet' && (
            <>
              <View style={s.walletCard}>
                <LinearGradient colors={[Colors.light.navy, Colors.light.navyMid]} style={s.walletCardInner}>
                  <View style={s.walletHeaderRow}>
                    <View style={s.walletLogoWrap}>
                      <Image source={require('@/assets/images/logo.jpeg')} style={s.walletLogo} />
                    </View>
                    <View style={s.walletTokenInfo}>
                      <Text style={[s.walletTokenName, { fontSize: fs(18) }]}>Good Coins</Text>
                      <Text style={[s.walletTokenSub, { fontSize: fs(11) }]}>Good Money AUD Stablecoin</Text>
                    </View>
                    <View style={s.walletPegBadge}>
                      <Text style={[s.walletPegText, { fontSize: fs(11) }]}>1:1 AUD</Text>
                    </View>
                  </View>

                  <Text style={[s.walletBalanceLabel, { fontSize: fs(11) }]}>Token Balance</Text>
                  <Text style={[s.walletBalanceBig, { fontSize: fs(36) }]}>{(state.tokenBalance ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<Text style={[s.walletBalanceCurrency, { fontSize: fs(16) }]}> Good Coins</Text></Text>
                  <Text style={[s.walletBalanceAud, { fontSize: fs(13) }]}>{'\u2248'} ${(state.tokenBalance ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD</Text>

                  <View style={s.walletStatsRow}>
                    <View style={s.walletStatItem}>
                      <Text style={[s.walletStatLabel, { fontSize: fs(10) }]}>Total Earned</Text>
                      <Text style={[s.walletStatValue, { fontSize: fs(14) }]}>{(state.totalTokensEarned ?? 0).toFixed(2)}</Text>
                    </View>
                    <View style={s.walletStatDivider} />
                    <View style={s.walletStatItem}>
                      <Text style={[s.walletStatLabel, { fontSize: fs(10) }]}>Rate</Text>
                      <Text style={[s.walletStatValue, { fontSize: fs(14) }]}>{TOKEN_RATE} coins = 1</Text>
                    </View>
                    <View style={s.walletStatDivider} />
                    <View style={s.walletStatItem}>
                      <Text style={[s.walletStatLabel, { fontSize: fs(10) }]}>Available Coins</Text>
                      <Text style={[s.walletStatValue, { fontSize: fs(14) }]}>{state.points.toLocaleString()}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={s.convertSection}>
                <Text style={[s.convertTitle, { fontSize: fs(16) }]}>Convert to Good Coins</Text>
                <Text style={[s.convertDesc, { fontSize: fs(12) }]}>{TOKEN_RATE} coins = 1.00 Good Coin (pegged 1:1 to AUD)</Text>

                <View style={s.convertInputRow}>
                  <View style={s.convertInputWrap}>
                    <TextInput
                      style={[s.convertInput, { fontSize: fs(16) }]}
                      placeholder="Enter coins"
                      placeholderTextColor={Colors.light.gray400}
                      keyboardType="number-pad"
                      value={convertAmount}
                      onChangeText={setConvertAmount}
                    />
                    <Text style={[s.convertInputSuffix, { fontSize: fs(13) }]}>coins</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={is(20)} color={Colors.light.gray400} />
                  <View style={s.convertOutputWrap}>
                    <Text style={[s.convertOutputValue, { fontSize: fs(16) }]}>
                      {convertAmount && !isNaN(parseInt(convertAmount)) ? (Math.floor(parseInt(convertAmount) / TOKEN_RATE)).toFixed(2) : '0.00'}
                    </Text>
                    <Text style={[s.convertOutputSuffix, { fontSize: fs(13) }]}>Good Coins</Text>
                  </View>
                </View>

                <View style={s.convertQuickRow}>
                  {[100, 500, 1000, 'Max'].map((val, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setConvertAmount(val === 'Max' ? String(state.points) : String(val))} 
                      style={s.convertQuickBtn}
                    >
                      <Text style={[s.convertQuickText, { fontSize: fs(12) }]}>{val === 'Max' ? 'MAX' : val}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={handleConvert}
                  style={({ pressed }) => [s.convertBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="swap-horizontal" size={is(18)} color="#fff" />
                  <Text style={[s.convertBtnText, { fontSize: fs(15) }]}>Convert to Good Coins</Text>
                </Pressable>
              </View>

              <View style={s.tokenInfoSection}>
                <Text style={[s.tokenInfoTitle, { fontSize: fs(16) }]}>About Good Coins</Text>
                <View style={s.tokenInfoRow}>
                  <View style={[s.tokenInfoIcon, { backgroundColor: '#D4AF3715' }]}>
                    <Ionicons name="shield-checkmark-outline" size={is(18)} color="#D4AF37" />
                  </View>
                  <View style={s.tokenInfoContent}>
                    <Text style={[s.tokenInfoLabel, { fontSize: fs(14) }]}>AUD Stablecoin</Text>
                    <Text style={[s.tokenInfoDesc, { fontSize: fs(12) }]}>Pegged 1:1 to the Australian Dollar. Your tokens hold stable value.</Text>
                  </View>
                </View>
                <View style={s.tokenInfoRow}>
                  <View style={[s.tokenInfoIcon, { backgroundColor: Colors.light.super + '15' }]}>
                    <Ionicons name="swap-horizontal-outline" size={is(18)} color={Colors.light.super} />
                  </View>
                  <View style={s.tokenInfoContent}>
                    <Text style={[s.tokenInfoLabel, { fontSize: fs(14) }]}>Instant Conversion</Text>
                    <Text style={[s.tokenInfoDesc, { fontSize: fs(12) }]}>Convert your earned points to Good Coins instantly at {TOKEN_RATE} points per coin.</Text>
                  </View>
                </View>
                <View style={s.tokenInfoRow}>
                  <View style={[s.tokenInfoIcon, { backgroundColor: Colors.light.income + '15' }]}>
                    <Ionicons name="gift-outline" size={is(18)} color={Colors.light.income} />
                  </View>
                  <View style={s.tokenInfoContent}>
                    <Text style={[s.tokenInfoLabel, { fontSize: fs(14) }]}>Redeem for Rewards</Text>
                    <Text style={[s.tokenInfoDesc, { fontSize: fs(12) }]}>Use Good Coins towards cashback, gift cards, and premium benefits.</Text>
                  </View>
                </View>
              </View>

              {(state.tokenTransactions ?? []).length > 0 && (
                <View style={s.txnSection}>
                  <Text style={[s.txnTitle, { fontSize: fs(16) }]}>Transaction History</Text>
                  {(state.tokenTransactions ?? []).slice(0, 10).map((txn) => (
                    <View key={txn.id} style={s.txnRow}>
                      <View style={s.txnIconWrap}>
                        <Ionicons name={txn.type === 'convert' ? 'swap-horizontal' : txn.type === 'reward' ? 'gift' : 'flash'} size={is(16)} color={Colors.light.tint} />
                      </View>
                      <View style={s.txnInfo}>
                        <Text style={[s.txnDesc, { fontSize: fs(13) }]}>{txn.description}</Text>
                        <Text style={[s.txnDate, { fontSize: fs(11) }]}>{new Date(txn.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={[s.txnAmount, { fontSize: fs(15) }]}>+{txn.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === 'redeem' && (
            <>
              <View style={s.sectionHeaderRow}>
                <Text style={[s.sectionTitle, { fontSize: fs(18) }]}>Popular Rewards</Text>
              </View>
              <Text style={[s.redeemBalance, { fontSize: fs(14) }]}>Your balance: {state.points.toLocaleString()} coins</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rewardsScroll} contentContainerStyle={s.rewardsScrollContent}>
                {rewards.map(r => (
                  <Pressable
                    key={r.id}
                    onPress={() => !r.redeemed && handleRedeem(r.id, r.title, r.pointsCost)}
                    style={({ pressed }) => [s.rewardCard, r.redeemed && s.rewardRedeemed, pressed && !r.redeemed && { opacity: 0.85 }]}
                  >
                    <View style={[s.rewardIconWrap, { backgroundColor: r.redeemed ? Colors.light.gray100 : Colors.light.tint + '12' }]}>
                      <Ionicons name={r.icon as any} size={is(28)} color={r.redeemed ? Colors.light.gray400 : Colors.light.tint} />
                    </View>
                    <Text style={[s.rewardTitle, { fontSize: fs(13) }]}>{r.title}</Text>
                    <Text style={[s.rewardCost, { fontSize: fs(13) }, r.redeemed && { color: Colors.light.gray400 }]}>
                      {r.redeemed ? 'Redeemed' : `${r.pointsCost.toLocaleString()} coins`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[s.sectionTitle, { marginTop: 28, fontSize: fs(18) }]}>How to Earn Coins</Text>
              {[
                { icon: 'flame-outline', label: 'Daily Check-in', pts: '+50/day', color: Colors.light.amber },
                { icon: 'sync-outline', label: 'Daily Spin', pts: 'Up to +500', color: Colors.light.super },
                { icon: 'ticket-outline', label: 'Weekly Scratch', pts: 'Up to +500', color: Colors.light.mortgage },
                { icon: 'checkmark-circle-outline', label: 'Missions', pts: '+50 to +400', color: Colors.light.income },
              ].map((item, i) => (
                <View key={i} style={s.earnRow}>
                  <View style={[s.earnIcon, { backgroundColor: item.color + '12' }]}>
                    <Ionicons name={item.icon as any} size={is(20)} color={item.color} />
                  </View>
                  <Text style={[s.earnLabel, { fontSize: fs(14) }]}>{item.label}</Text>
                  <Text style={[s.earnPts, { fontSize: fs(14) }]}>{item.pts}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
      <MessageOverlay screen="rewards" />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.light.background },

  heroCard: { marginHorizontal: 20, marginBottom: 16, borderRadius: 20, overflow: 'hidden' },
  heroGradient: { padding: 20, borderRadius: 20 },
  pointsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  pointsLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  pointsBig: { fontSize: 36, fontFamily: 'DMSans_700Bold', color: '#fff', marginTop: 4 },
  pointsSuffix: { fontSize: 18, color: 'rgba(255,255,255,0.5)' },
  pointsCash: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 2 },
  levelBadge: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(13,148,136,0.4)', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 70 },
  levelBadgeLabel: { fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: 'rgba(255,255,255,0.5)', letterSpacing: 1 },
  levelBadgeNum: { fontSize: 24, fontFamily: 'DMSans_700Bold', color: Colors.light.tintLight, marginTop: 2 },
  levelBadgeName: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: Colors.light.tintLight, marginTop: 2 },
  weekendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D4AF3720', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  weekendBadgeText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: '#D4AF37' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 8 },
  xpLabel: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: 'rgba(255,255,255,0.5)' },
  xpNums: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: 'rgba(255,255,255,0.5)' },
  xpBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: 6, borderRadius: 3 },
  xpRemaining: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: '#fff' },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },

  tabBar: { flexDirection: 'row', gap: 6, marginHorizontal: 20, marginBottom: 16 },
  tabItem: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.light.card },
  tabItemActive: { backgroundColor: Colors.light.tint + '15' },
  tabText: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: Colors.light.gray400 },
  tabTextActive: { color: Colors.light.tint, fontFamily: 'DMSans_600SemiBold' },

  body: { paddingHorizontal: 20 },

  factFindCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden' },
  factFindGradient: { padding: 18, borderRadius: 16 },
  factFindRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  factFindLabel: { fontSize: 10, fontFamily: 'DMSans_700Bold', color: '#D4AF37', letterSpacing: 1 },
  factFindTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#fff', marginBottom: 2 },
  factFindSub: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: 'rgba(255,255,255,0.7)' },
  factFindProgress: { alignItems: 'center', width: 54 },
  factFindPct: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: '#fff' },
  factFindBarBg: { width: 54, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 2, marginTop: 4 },
  factFindBarFill: { height: 4, backgroundColor: '#D4AF37', borderRadius: 2 },
  factFindCoinsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  factFindCoinsText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: 'rgba(255,255,255,0.8)', flex: 1 },

  promoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.light.card, borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#D4AF3730' },
  promoInfo: { flex: 1 },
  promoTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: '#D4AF37', letterSpacing: 0.5 },
  promoDesc: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.text, marginTop: 2 },
  promoExpiry: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginTop: 2 },
  promo2x: { fontSize: 28, fontFamily: 'DMSans_700Bold', color: '#D4AF37' },

  spinSection: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, marginBottom: 16 },
  spinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  spinTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spinLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: Colors.light.super, letterSpacing: 1 },
  spinResetBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spinResetLabel: { fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: Colors.light.textMuted, letterSpacing: 0.5 },
  spinResetTime: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: Colors.light.expense },
  spinTitle: { fontSize: 20, fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginBottom: 2 },
  spinSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginBottom: 20 },
  wheelContainer: { alignItems: 'center', justifyContent: 'center', height: 220, marginBottom: 16 },
  wheel: { width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.light.gray100, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.light.super },
  wheelSegment: { position: 'absolute', width: 200, height: 200, alignItems: 'center' },
  segmentInner: { width: 80, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  segmentText: { fontSize: 10, fontFamily: 'DMSans_700Bold', color: '#fff' },
  wheelCenter: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.light.navy, borderWidth: 2, borderColor: Colors.light.super, alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  wheelPointer: { position: 'absolute', top: 0, zIndex: 20 },
  prizeResult: { alignItems: 'center', marginBottom: 12 },
  prizeText: { fontSize: 22, fontFamily: 'DMSans_700Bold', color: Colors.light.income },
  spinBtn: { backgroundColor: Colors.light.super, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  spinBtnDisabled: { backgroundColor: Colors.light.gray200, opacity: 0.6 },
  spinBtnText: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#fff', letterSpacing: 1 },

  scratchSection: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, marginBottom: 16 },
  scratchHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  scratchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scratchLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: Colors.light.tint, letterSpacing: 1 },
  scratchNewBadge: { backgroundColor: Colors.light.expense + '15', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  scratchNewText: { fontSize: 10, fontFamily: 'DMSans_700Bold', color: Colors.light.expense },
  scratchTitle: { fontSize: 20, fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginBottom: 2 },
  scratchSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginBottom: 16 },
  scratchCardBody: { borderRadius: 12, overflow: 'hidden' },
  scratchCardGradient: { padding: 32, alignItems: 'center', justifyContent: 'center', minHeight: 140, borderRadius: 12 },
  scratchIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#D4AF3720', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  scratchTapText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', color: '#fff' },
  scratchTapSub: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  scratchPrizeText: { fontSize: 32, fontFamily: 'DMSans_700Bold', color: '#fff', marginTop: 8 },
  scratchWonText: { fontSize: 14, fontFamily: 'DMSans_400Regular', color: 'rgba(255,255,255,0.8)', marginTop: 4 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: Colors.light.text },

  missionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.card, borderRadius: 14, padding: 16, marginBottom: 12 },
  missionCompleted: { opacity: 0.5 },
  missionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  missionInfo: { flex: 1 },
  missionTitle: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: Colors.light.text },
  missionTitleDone: { textDecorationLine: 'line-through' as const, color: Colors.light.gray400 },
  missionDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginTop: 2 },
  missionExpiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  missionExpiry: { fontSize: 11, fontFamily: 'DMSans_500Medium', color: Colors.light.amber },
  missionPtsCol: { alignItems: 'flex-end', marginLeft: 8 },
  missionOldPts: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, textDecorationLine: 'line-through' as const },
  missionPts: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: Colors.light.income },
  missionPtsSuffix: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted },
  mission2xBadge: { backgroundColor: Colors.light.income + '15', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
  mission2xText: { fontSize: 9, fontFamily: 'DMSans_700Bold', color: Colors.light.income, letterSpacing: 0.5 },

  badgesSubtitle: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginBottom: 16 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeItem: { width: (SCREEN_W - 64) / 3, backgroundColor: Colors.light.card, borderRadius: 14, padding: 14, alignItems: 'center' },
  badgeLocked: { opacity: 0.4 },
  badgeIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeName: { fontSize: 12, fontFamily: 'DMSans_700Bold', color: Colors.light.text, textAlign: 'center' },
  badgeNameLocked: { color: Colors.light.gray400 },
  badgeDesc: { fontSize: 10, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, textAlign: 'center', marginTop: 2 },
  badgeCheck: { position: 'absolute', top: 8, right: 8 },

  redeemBalance: { fontSize: 14, fontFamily: 'DMSans_500Medium', color: Colors.light.textMuted, marginBottom: 16 },
  rewardsScroll: { marginBottom: 8 },
  rewardsScrollContent: { gap: 12 },
  rewardCard: { width: 140, backgroundColor: Colors.light.card, borderRadius: 14, padding: 16, alignItems: 'center' },
  rewardRedeemed: { opacity: 0.4 },
  rewardIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  rewardTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: Colors.light.text, textAlign: 'center', marginBottom: 4 },
  rewardCost: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: Colors.light.tint, textAlign: 'center' },

  earnRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.card, borderRadius: 12, padding: 14, marginBottom: 8 },
  earnIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  earnLabel: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: Colors.light.text, flex: 1 },
  earnPts: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: Colors.light.income },

  walletCard: { marginBottom: 20, borderRadius: 20, overflow: 'hidden' },
  walletCardInner: { borderRadius: 20, padding: 20 },
  walletHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  walletLogoWrap: { marginRight: 12 },
  walletLogo: { width: 40, height: 40, borderRadius: 20 },
  walletTokenInfo: { flex: 1 },
  walletTokenName: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: '#D4AF37' },
  walletTokenSub: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: 'rgba(255,255,255,0.5)' },
  walletPegBadge: { backgroundColor: 'rgba(16,185,129,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  walletPegText: { fontSize: 11, fontFamily: 'DMSans_700Bold', color: '#4ade80' },
  walletBalanceLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 4 },
  walletBalanceBig: { fontSize: 36, fontFamily: 'DMSans_700Bold', color: '#D4AF37' },
  walletBalanceCurrency: { fontSize: 16, color: 'rgba(255,255,255,0.4)' },
  walletBalanceAud: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: 'rgba(255,255,255,0.5)', marginTop: 2, marginBottom: 16 },
  walletStatsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  walletStatItem: { alignItems: 'center', flex: 1 },
  walletStatLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: 'rgba(255,255,255,0.4)', letterSpacing: 0.5, marginBottom: 4 },
  walletStatValue: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: '#fff' },
  walletStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },

  convertSection: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, marginBottom: 16 },
  convertTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginBottom: 4 },
  convertDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginBottom: 16 },
  convertInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  convertInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.light.gray50, borderRadius: 10, borderWidth: 1, borderColor: Colors.light.gray200, paddingHorizontal: 12 },
  convertInput: { flex: 1, height: 44, fontSize: 16, fontFamily: 'DMSans_600SemiBold', color: Colors.light.text },
  convertInputSuffix: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: Colors.light.textMuted },
  convertOutputWrap: { flex: 1, backgroundColor: '#D4AF3710', borderRadius: 10, borderWidth: 1, borderColor: '#D4AF3730', height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  convertOutputValue: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#D4AF37', flex: 1 },
  convertOutputSuffix: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: '#D4AF37' },
  convertQuickRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  convertQuickBtn: { backgroundColor: Colors.light.gray100, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  convertQuickText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: Colors.light.textSecondary },
  convertBtn: { backgroundColor: Colors.light.tint, borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  convertBtnText: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#fff' },

  tokenInfoSection: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, marginBottom: 16 },
  tokenInfoTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginBottom: 16 },
  tokenInfoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  tokenInfoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tokenInfoContent: { flex: 1 },
  tokenInfoLabel: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: Colors.light.text, marginBottom: 2 },
  tokenInfoDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted },

  txnSection: { backgroundColor: Colors.light.card, borderRadius: 16, padding: 20, marginBottom: 16 },
  txnTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: Colors.light.text, marginBottom: 16 },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.light.gray100 },
  txnIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.light.tint + '12', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: Colors.light.text },
  txnDate: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: Colors.light.textMuted, marginTop: 2 },
  txnAmount: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: Colors.light.tint },
});
