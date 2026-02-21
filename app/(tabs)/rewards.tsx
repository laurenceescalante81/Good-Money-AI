import React, { useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert, Platform, Dimensions, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withSpring, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import { router } from 'expo-router';
import { useRewards, Mission, TokenTransaction } from '@/contexts/RewardsContext';
import Colors from '@/constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');
const fmt = (n: number) => '$' + n.toLocaleString('en-AU', { maximumFractionDigits: 0 });

type TabKey = 'hub' | 'missions' | 'badges' | 'redeem' | 'wallet';

function SpinWheel() {
  const { canSpin, spinWheel, spinResetTime } = useRewards();
  const [spinning, setSpinning] = useState(false);
  const [prize, setPrize] = useState<number | null>(null);
  const rotation = useSharedValue(0);
  const SEGMENTS = [
    { label: '25 pts', color: '#6366F1' },
    { label: '75 pts', color: '#8B5CF6' },
    { label: '150 pts', color: '#A855F7' },
    { label: '300 pts', color: '#7C3AED' },
    { label: '50 pts', color: '#6D28D9' },
    { label: '200 pts', color: '#5B21B6' },
    { label: '100 pts', color: '#4C1D95' },
    { label: '500 pts', color: '#581C87' },
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
          <Ionicons name="sync" size={16} color="#D4AF37" />
          <Text style={s.spinLabel}>DAILY SPIN</Text>
        </View>
        <View style={s.spinResetBadge}>
          <Text style={s.spinResetLabel}>RESETS IN</Text>
          <Text style={s.spinResetTime}>{spinResetTime}</Text>
        </View>
      </View>
      <Text style={s.spinTitle}>Spin for bonus points</Text>
      <Text style={s.spinSub}>1 free spin per day — up to 500 pts</Text>

      <View style={s.wheelContainer}>
        <Animated.View style={[s.wheel, wheelStyle]}>
          {SEGMENTS.map((seg, i) => {
            const angle = (i * 360) / SEGMENTS.length;
            return (
              <View key={i} style={[s.wheelSegment, { transform: [{ rotate: `${angle}deg` }] }]}>
                <View style={[s.segmentInner, { backgroundColor: seg.color }]}>
                  <Text style={s.segmentText}>{seg.label}</Text>
                </View>
              </View>
            );
          })}
          <View style={s.wheelCenter}>
            <Ionicons name="gift" size={20} color="#fff" />
          </View>
        </Animated.View>
        <View style={s.wheelPointer}>
          <Ionicons name="caret-down" size={24} color="#D4AF37" />
        </View>
      </View>

      {prize !== null && (
        <View style={s.prizeResult}>
          <Text style={s.prizeText}>+{prize} pts earned!</Text>
        </View>
      )}

      <Pressable
        onPress={handleSpin}
        disabled={!canSpin || spinning}
        style={({ pressed }) => [s.spinBtn, (!canSpin || spinning) && s.spinBtnDisabled, pressed && { opacity: 0.85 }]}
      >
        <Text style={s.spinBtnText}>{spinning ? 'Spinning...' : canSpin ? 'SPIN' : 'Come back tomorrow'}</Text>
      </Pressable>
    </View>
  );
}

function ScratchCard() {
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
          <Ionicons name="ticket" size={16} color="#D4AF37" />
          <Text style={s.scratchLabel}>WEEKLY SCRATCH</Text>
        </View>
        <View style={s.scratchNewBadge}>
          <Text style={s.scratchNewText}>NEW</Text>
        </View>
      </View>
      <Text style={s.scratchTitle}>Scratch for a bonus reward</Text>
      <Text style={s.scratchSub}>1 card available this week</Text>

      <Pressable onPress={handleScratch} disabled={revealed || !canScratch}>
        <Animated.View style={[s.scratchCardBody, cardStyle]}>
          <LinearGradient
            colors={revealed ? ['#1a2942', '#0f1c30'] : ['#2a3f5f', '#1a2942', '#2a3f5f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.scratchCardGradient}
          >
            {!revealed ? (
              <>
                <View style={s.scratchIconWrap}>
                  <Ionicons name="gift" size={32} color="#D4AF37" />
                </View>
                <Text style={s.scratchTapText}>Tap to Scratch</Text>
                <Text style={s.scratchTapSub}>PP Bonus Card</Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={36} color="#4ade80" />
                <Text style={s.scratchPrizeText}>+{prize} pts</Text>
                <Text style={s.scratchWonText}>Bonus points added!</Text>
              </>
            )}
          </LinearGradient>
        </Animated.View>
      </Pressable>
    </View>
  );
}

function MissionItem({ mission }: { mission: Mission }) {
  const now = Date.now();
  const remaining = Math.max(0, mission.expiresAt - now);
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const expiryText = days > 0 ? `${days}d ${hours}h` : `${hours}h`;
  const effectivePts = mission.is2xActive ? mission.basePoints * 2 : mission.basePoints;

  return (
    <View style={[s.missionItem, mission.completed && s.missionCompleted]}>
      <View style={[s.missionIcon, { backgroundColor: mission.iconBg + '20' }]}>
        <Ionicons name={mission.icon as any} size={22} color={mission.iconBg} />
      </View>
      <View style={s.missionInfo}>
        <Text style={[s.missionTitle, mission.completed && s.missionTitleDone]}>{mission.title}</Text>
        <Text style={s.missionDesc}>{mission.description}</Text>
        {!mission.completed && (
          <View style={s.missionExpiryRow}>
            <Ionicons name="hourglass-outline" size={12} color="#F59E0B" />
            <Text style={s.missionExpiry}>Expires in {expiryText}</Text>
          </View>
        )}
      </View>
      <View style={s.missionPtsCol}>
        {mission.is2xActive && (
          <>
            <Text style={s.missionOldPts}>+{mission.basePoints}</Text>
            <View style={s.mission2xBadge}>
              <Text style={s.mission2xText}>2x ACTIVE</Text>
            </View>
          </>
        )}
        <Text style={[s.missionPts, mission.completed && { color: Colors.light.gray400 }]}>
          {mission.completed ? 'Done' : `+${effectivePts}`}
        </Text>
        {!mission.completed && !mission.is2xActive && <Text style={s.missionPtsSuffix}>pts</Text>}
      </View>
    </View>
  );
}

function BadgeItem({ badge }: { badge: { id: string; title: string; description: string; icon: string; color: string; unlocked: boolean } }) {
  return (
    <View style={[s.badgeItem, !badge.unlocked && s.badgeLocked]}>
      <View style={[s.badgeIconWrap, { backgroundColor: badge.unlocked ? badge.color + '20' : '#1a2942' }]}>
        <Ionicons name={badge.icon as any} size={24} color={badge.unlocked ? badge.color : Colors.light.gray500} />
      </View>
      <Text style={[s.badgeName, !badge.unlocked && s.badgeNameLocked]}>{badge.title}</Text>
      <Text style={s.badgeDesc}>{badge.description}</Text>
      {badge.unlocked && <Ionicons name="checkmark-circle" size={16} color="#4ade80" style={s.badgeCheck} />}
    </View>
  );
}

export default function RewardsScreen() {
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
  const cashValue = (state.points / 100).toFixed(2);

  const completedMissions = missions.filter(m => m.completed).length;
  const unlockedBadges = badges.filter(b => b.unlocked).length;

  const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  const handleRedeem = (id: string, title: string, cost: number) => {
    if (state.points < cost) {
      Alert.alert('Not enough points', `You need ${cost - state.points} more points to redeem ${title}.`);
      return;
    }
    Alert.alert('Redeem Reward', `Spend ${cost} points for ${title}?`, [
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
      Alert.alert('Minimum Conversion', `You need at least ${TOKEN_RATE} points to convert to 1 ppAUD token.`);
      return;
    }
    if (pts > state.points) {
      Alert.alert('Not Enough Points', `You only have ${state.points.toLocaleString()} points available.`);
      return;
    }
    const tokens = Math.floor(pts / TOKEN_RATE);
    Alert.alert('Convert to ppAUD', `Convert ${tokens * TOKEN_RATE} points into ${tokens} ppAUD tokens?`, [
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

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'hub', label: 'Hub' },
    { key: 'wallet', label: 'Wallet' },
    { key: 'missions', label: 'Missions' },
    { key: 'badges', label: 'Badges' },
    { key: 'redeem', label: 'Redeem' },
  ];

  return (
    <View style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <LinearGradient colors={['#0C1B2A', '#132D46', '#1B3A5C']} style={[s.heroGradient, { paddingTop: topInset + 16 }]}>
          <View style={s.headerRow}>
            <View>
              <Text style={s.appName}>Good Money</Text>
              <Text style={s.greeting}>REWARDS & MISSIONS</Text>
            </View>
            <View style={s.avatarCircle}>
              <Ionicons name="person" size={20} color="#fff" />
            </View>
          </View>

          <View style={s.pointsCard}>
            <LinearGradient colors={['#1a2942', '#0f1c30']} style={s.pointsCardInner}>
              <View style={s.pointsTopRow}>
                <View>
                  <Text style={s.pointsLabel}>PP POINTS</Text>
                  <Text style={s.pointsBig}>{state.points.toLocaleString()}<Text style={s.pointsSuffix}> pts</Text></Text>
                  <Text style={s.pointsCash}>{'\u2248'} ${cashValue} cash value</Text>
                  {(state.tokenBalance ?? 0) > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                      <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#D4AF37', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 7, fontFamily: 'DMSans_700Bold' as const, color: '#0C1B2A' }}>pp</Text>
                      </View>
                      <Text style={{ fontSize: 12, fontFamily: 'DMSans_600SemiBold' as const, color: '#D4AF37' }}>{(state.tokenBalance ?? 0).toFixed(2)} ppAUD</Text>
                    </View>
                  )}
                </View>
                <View style={s.levelBadge}>
                  <Text style={s.levelBadgeLabel}>LEVEL</Text>
                  <Text style={s.levelBadgeNum}>{state.level}</Text>
                  <Text style={s.levelBadgeName}>{levelName}</Text>
                </View>
              </View>

              {is2xWeekend && (
                <View style={s.weekendBadge}>
                  <Ionicons name="flash" size={12} color="#D4AF37" />
                  <Text style={s.weekendBadgeText}>2x Weekend</Text>
                </View>
              )}

              <View style={s.xpRow}>
                <Text style={s.xpLabel}>Lv {state.level} {'\u2192'} Lv {state.level + 1}</Text>
                <Text style={s.xpNums}>{state.xp.toLocaleString()} / {xpNeeded.toLocaleString()} XP</Text>
              </View>
              <View style={s.xpBarBg}>
                <LinearGradient colors={['#6366F1', '#8B5CF6']} style={[s.xpBarFill, { width: `${xpPct}%` }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              </View>
              <Text style={s.xpRemaining}>{(xpNeeded - state.xp).toLocaleString()} XP to next level</Text>

              <View style={s.statsRow}>
                <View style={s.statItem}>
                  <Text style={s.statLabel}>MISSIONS</Text>
                  <Text style={s.statValue}>{completedMissions}/{missions.length}</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statItem}>
                  <Text style={s.statLabel}>BADGES</Text>
                  <Text style={s.statValue}>{unlockedBadges}/{badges.length}</Text>
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
                <Text style={[s.tabText, activeTab === tab.key && s.tabTextActive]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>
        </LinearGradient>

        <View style={s.body}>
          {activeTab === 'hub' && (
            <>
              <Pressable style={s.factFindCard} onPress={() => router.push('/(tabs)/fact-find' as any)}>
                <LinearGradient colors={['#0D9488', '#0F766E']} style={s.factFindGradient}>
                  <View style={s.factFindRow}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <Ionicons name="search" size={14} color="#D4AF37" />
                        <Text style={s.factFindLabel}>FINANCIAL FACT FIND</Text>
                      </View>
                      <Text style={s.factFindTitle}>Complete your profile & earn Good Coins</Text>
                      <Text style={s.factFindSub}>Enter your details to unlock comparisons & switch requests</Text>
                    </View>
                    <View style={s.factFindProgress}>
                      <Text style={s.factFindPct}>{getFactFindProgress().percentage}%</Text>
                      <View style={s.factFindBarBg}>
                        <View style={[s.factFindBarFill, { width: `${getFactFindProgress().percentage}%` }]} />
                      </View>
                    </View>
                  </View>
                  <View style={s.factFindCoinsRow}>
                    <View style={{ width: 16, height: 16, borderRadius: 8, backgroundColor: '#F59E0B', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#D4930D' }}><Text style={{ fontSize: 8, fontWeight: '800', color: '#7C5800' }}>$</Text></View>
                    <Text style={s.factFindCoinsText}>Earn up to 5,450 Good Coins</Text>
                    <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
                  </View>
                </LinearGradient>
              </Pressable>

              {is2xWeekend && (
                <View style={s.promoCard}>
                  <Ionicons name="flash" size={18} color="#D4AF37" />
                  <View style={s.promoInfo}>
                    <Text style={s.promoTitle}>2x POINTS WEEKEND</Text>
                    <Text style={s.promoDesc}>All missions earn double this weekend</Text>
                    <Text style={s.promoExpiry}>Ends Sunday at midnight</Text>
                  </View>
                  <Text style={s.promo2x}>2x</Text>
                </View>
              )}

              <SpinWheel />
              <ScratchCard />
            </>
          )}

          {activeTab === 'missions' && (
            <>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionTitle}>Active Missions</Text>
              </View>
              {missions.filter(m => !m.completed).map(m => <MissionItem key={m.id} mission={m} />)}
              {missions.filter(m => m.completed).length > 0 && (
                <>
                  <Text style={[s.sectionTitle, { marginTop: 24 }]}>Completed</Text>
                  {missions.filter(m => m.completed).map(m => <MissionItem key={m.id} mission={m} />)}
                </>
              )}
            </>
          )}

          {activeTab === 'badges' && (
            <>
              <Text style={s.sectionTitle}>Your Badges</Text>
              <Text style={s.badgesSubtitle}>{unlockedBadges} of {badges.length} unlocked</Text>
              <View style={s.badgesGrid}>
                {badges.map(b => <BadgeItem key={b.id} badge={b} />)}
              </View>
            </>
          )}

          {activeTab === 'wallet' && (
            <>
              <View style={s.walletCard}>
                <LinearGradient colors={['#1a2942', '#0f1c30']} style={s.walletCardInner}>
                  <View style={s.walletHeaderRow}>
                    <View style={s.walletLogoWrap}>
                      <LinearGradient colors={['#D4AF37', '#F5D060']} style={s.walletLogo}>
                        <Text style={s.walletLogoText}>pp</Text>
                      </LinearGradient>
                    </View>
                    <View style={s.walletTokenInfo}>
                      <Text style={s.walletTokenName}>ppAUD</Text>
                      <Text style={s.walletTokenSub}>Good Money AUD Stablecoin</Text>
                    </View>
                    <View style={s.walletPegBadge}>
                      <Text style={s.walletPegText}>1:1 AUD</Text>
                    </View>
                  </View>

                  <Text style={s.walletBalanceLabel}>Token Balance</Text>
                  <Text style={s.walletBalanceBig}>{(state.tokenBalance ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}<Text style={s.walletBalanceCurrency}> ppAUD</Text></Text>
                  <Text style={s.walletBalanceAud}>{'\u2248'} ${(state.tokenBalance ?? 0).toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AUD</Text>

                  <View style={s.walletStatsRow}>
                    <View style={s.walletStatItem}>
                      <Text style={s.walletStatLabel}>Total Earned</Text>
                      <Text style={s.walletStatValue}>{(state.totalTokensEarned ?? 0).toFixed(2)}</Text>
                    </View>
                    <View style={s.walletStatDivider} />
                    <View style={s.walletStatItem}>
                      <Text style={s.walletStatLabel}>Rate</Text>
                      <Text style={s.walletStatValue}>{TOKEN_RATE} pts = 1</Text>
                    </View>
                    <View style={s.walletStatDivider} />
                    <View style={s.walletStatItem}>
                      <Text style={s.walletStatLabel}>Available Pts</Text>
                      <Text style={s.walletStatValue}>{state.points.toLocaleString()}</Text>
                    </View>
                  </View>
                </LinearGradient>
              </View>

              <View style={s.convertSection}>
                <Text style={s.convertTitle}>Convert Points to ppAUD</Text>
                <Text style={s.convertDesc}>{TOKEN_RATE} points = 1.00 ppAUD (pegged 1:1 to AUD)</Text>

                <View style={s.convertInputRow}>
                  <View style={s.convertInputWrap}>
                    <TextInput
                      style={s.convertInput}
                      placeholder="Enter points"
                      placeholderTextColor={Colors.light.gray500}
                      keyboardType="number-pad"
                      value={convertAmount}
                      onChangeText={setConvertAmount}
                    />
                    <Text style={s.convertInputSuffix}>pts</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={20} color={Colors.light.gray400} />
                  <View style={s.convertOutputWrap}>
                    <Text style={s.convertOutputValue}>
                      {convertAmount && !isNaN(parseInt(convertAmount)) ? (Math.floor(parseInt(convertAmount) / TOKEN_RATE)).toFixed(2) : '0.00'}
                    </Text>
                    <Text style={s.convertOutputSuffix}>ppAUD</Text>
                  </View>
                </View>

                <View style={s.convertQuickRow}>
                  {[100, 500, 1000, 'Max'].map((val, i) => (
                    <Pressable
                      key={i}
                      onPress={() => setConvertAmount(val === 'Max' ? String(state.points) : String(val))}
                      style={s.convertQuickBtn}
                    >
                      <Text style={s.convertQuickText}>{val === 'Max' ? 'MAX' : val}</Text>
                    </Pressable>
                  ))}
                </View>

                <Pressable
                  onPress={handleConvert}
                  style={({ pressed }) => [s.convertBtn, pressed && { opacity: 0.85 }]}
                >
                  <Ionicons name="swap-horizontal" size={18} color="#fff" />
                  <Text style={s.convertBtnText}>Convert to ppAUD</Text>
                </Pressable>
              </View>

              <View style={s.tokenInfoSection}>
                <Text style={s.tokenInfoTitle}>About ppAUD</Text>
                <View style={s.tokenInfoRow}>
                  <View style={[s.tokenInfoIcon, { backgroundColor: '#D4AF3720' }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#D4AF37" />
                  </View>
                  <View style={s.tokenInfoContent}>
                    <Text style={s.tokenInfoLabel}>AUD Stablecoin</Text>
                    <Text style={s.tokenInfoDesc}>Pegged 1:1 to the Australian Dollar. Your tokens hold stable value.</Text>
                  </View>
                </View>
                <View style={s.tokenInfoRow}>
                  <View style={[s.tokenInfoIcon, { backgroundColor: '#6366F120' }]}>
                    <Ionicons name="swap-horizontal-outline" size={18} color="#6366F1" />
                  </View>
                  <View style={s.tokenInfoContent}>
                    <Text style={s.tokenInfoLabel}>Instant Conversion</Text>
                    <Text style={s.tokenInfoDesc}>Convert your earned points to ppAUD tokens instantly at {TOKEN_RATE} pts per token.</Text>
                  </View>
                </View>
                <View style={s.tokenInfoRow}>
                  <View style={[s.tokenInfoIcon, { backgroundColor: '#10B98120' }]}>
                    <Ionicons name="gift-outline" size={18} color="#10B981" />
                  </View>
                  <View style={s.tokenInfoContent}>
                    <Text style={s.tokenInfoLabel}>Redeem for Rewards</Text>
                    <Text style={s.tokenInfoDesc}>Use ppAUD tokens towards cashback, gift cards, and premium benefits.</Text>
                  </View>
                </View>
              </View>

              {(state.tokenTransactions ?? []).length > 0 && (
                <View style={s.txnSection}>
                  <Text style={s.txnTitle}>Transaction History</Text>
                  {(state.tokenTransactions ?? []).slice(0, 10).map((txn) => (
                    <View key={txn.id} style={s.txnRow}>
                      <View style={s.txnIconWrap}>
                        <Ionicons name={txn.type === 'convert' ? 'swap-horizontal' : txn.type === 'reward' ? 'gift' : 'flash'} size={16} color="#D4AF37" />
                      </View>
                      <View style={s.txnInfo}>
                        <Text style={s.txnDesc}>{txn.description}</Text>
                        <Text style={s.txnDate}>{new Date(txn.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</Text>
                      </View>
                      <Text style={s.txnAmount}>+{txn.amount.toFixed(2)}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {activeTab === 'redeem' && (
            <>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionTitle}>Popular Rewards</Text>
              </View>
              <Text style={s.redeemBalance}>Your balance: {state.points.toLocaleString()} pts</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.rewardsScroll} contentContainerStyle={s.rewardsScrollContent}>
                {rewards.map(r => (
                  <Pressable
                    key={r.id}
                    onPress={() => !r.redeemed && handleRedeem(r.id, r.title, r.pointsCost)}
                    style={({ pressed }) => [s.rewardCard, r.redeemed && s.rewardRedeemed, pressed && !r.redeemed && { opacity: 0.85 }]}
                  >
                    <View style={[s.rewardIconWrap, { backgroundColor: r.redeemed ? Colors.light.gray200 : Colors.light.tint + '15' }]}>
                      <Ionicons name={r.icon as any} size={28} color={r.redeemed ? Colors.light.gray400 : Colors.light.tint} />
                    </View>
                    <Text style={s.rewardTitle}>{r.title}</Text>
                    <Text style={[s.rewardCost, r.redeemed && { color: Colors.light.gray400 }]}>
                      {r.redeemed ? 'Redeemed' : `${r.pointsCost.toLocaleString()} pts`}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={[s.sectionTitle, { marginTop: 28 }]}>How to Earn Points</Text>
              {[
                { icon: 'flame-outline', label: 'Daily Check-in', pts: '+50/day', color: '#F59E0B' },
                { icon: 'sync-outline', label: 'Daily Spin', pts: 'Up to +500', color: '#8B5CF6' },
                { icon: 'ticket-outline', label: 'Weekly Scratch', pts: 'Up to +500', color: '#3B82F6' },
                { icon: 'checkmark-circle-outline', label: 'Complete Missions', pts: '+50 to +400', color: '#10B981' },
              ].map((item, i) => (
                <View key={i} style={s.earnRow}>
                  <View style={[s.earnIcon, { backgroundColor: item.color + '15' }]}>
                    <Ionicons name={item.icon as any} size={20} color={item.color} />
                  </View>
                  <Text style={s.earnLabel}>{item.label}</Text>
                  <Text style={s.earnPts}>{item.pts}</Text>
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C1B2A' },
  heroGradient: { paddingHorizontal: 20, paddingBottom: 0 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  appName: { fontSize: 22, fontFamily: 'DMSans_700Bold', color: '#fff' },
  greeting: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: '#D4AF37', letterSpacing: 1, marginTop: 2 },
  avatarCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.light.tint, alignItems: 'center', justifyContent: 'center' },
  pointsCard: { marginBottom: 20 },
  pointsCardInner: { borderRadius: 16, padding: 20, borderWidth: 1, borderColor: 'rgba(99,102,241,0.2)' },
  pointsTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  pointsLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: Colors.light.gray400, letterSpacing: 1 },
  pointsBig: { fontSize: 36, fontFamily: 'DMSans_700Bold', color: '#fff', marginTop: 4 },
  pointsSuffix: { fontSize: 18, color: Colors.light.gray400 },
  pointsCash: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginTop: 2 },
  levelBadge: { backgroundColor: '#1a2942', borderWidth: 1, borderColor: '#6366F1', borderRadius: 12, padding: 10, alignItems: 'center', minWidth: 70 },
  levelBadgeLabel: { fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: Colors.light.gray400, letterSpacing: 1 },
  levelBadgeNum: { fontSize: 24, fontFamily: 'DMSans_700Bold', color: '#6366F1', marginTop: 2 },
  levelBadgeName: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: '#6366F1', marginTop: 2 },
  weekendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#D4AF3720', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 12 },
  weekendBadgeText: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: '#D4AF37' },
  xpRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, marginTop: 8 },
  xpLabel: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: Colors.light.gray400 },
  xpNums: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: Colors.light.gray400 },
  xpBarBg: { height: 6, backgroundColor: '#1a2942', borderRadius: 3, overflow: 'hidden' },
  xpBarFill: { height: 6, borderRadius: 3 },
  xpRemaining: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: Colors.light.gray500, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  statItem: { alignItems: 'center', flex: 1 },
  statLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: Colors.light.gray500, letterSpacing: 1, marginBottom: 4 },
  statValue: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: '#fff' },
  statStreakRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },
  tabBar: { flexDirection: 'row', gap: 4, marginBottom: 0 },
  tabItem: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  tabItemActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  tabText: { fontSize: 14, fontFamily: 'DMSans_500Medium', color: Colors.light.gray400 },
  tabTextActive: { color: '#fff' },
  body: { paddingHorizontal: 20, paddingTop: 20 },

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

  streakSection: { backgroundColor: '#132D46', borderRadius: 16, padding: 20, marginBottom: 16 },
  streakHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  streakTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  streakLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: '#F59E0B', letterSpacing: 1 },
  streakPtsBadge: { backgroundColor: '#0D948820', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, alignItems: 'center' },
  streakPtsText: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#4ade80' },
  streakPtsSub: { fontSize: 10, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400 },
  streakBig: { fontSize: 24, fontFamily: 'DMSans_700Bold', color: '#fff', marginBottom: 4 },
  streakSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginBottom: 20 },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  dayCol: { alignItems: 'center', gap: 6 },
  dayCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1a2942', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  dayCircleChecked: { backgroundColor: '#F59E0B20', borderColor: '#F59E0B' },
  dayCircleToday: { borderColor: '#8B5CF6', borderWidth: 2 },
  dayEmpty: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.1)' },
  dayLabel: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: Colors.light.gray500 },
  dayLabelToday: { color: '#8B5CF6', fontFamily: 'DMSans_700Bold' },
  milestoneBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#D4AF3710', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#D4AF3730' },
  milestoneText: { fontSize: 12, fontFamily: 'DMSans_500Medium', color: '#D4AF37', flex: 1 },
  milestoneDays: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400 },

  promoCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#132D46', borderRadius: 16, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#D4AF3730' },
  promoInfo: { flex: 1 },
  promoTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: '#D4AF37', letterSpacing: 0.5 },
  promoDesc: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: '#fff', marginTop: 2 },
  promoExpiry: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginTop: 2 },
  promo2x: { fontSize: 28, fontFamily: 'DMSans_700Bold', color: '#D4AF37' },

  spinSection: { backgroundColor: '#132D46', borderRadius: 16, padding: 20, marginBottom: 16 },
  spinHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  spinTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spinLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: '#D4AF37', letterSpacing: 1 },
  spinResetBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  spinResetLabel: { fontSize: 9, fontFamily: 'DMSans_600SemiBold', color: Colors.light.gray500, letterSpacing: 0.5 },
  spinResetTime: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: '#EF4444' },
  spinTitle: { fontSize: 20, fontFamily: 'DMSans_700Bold', color: '#fff', marginBottom: 2 },
  spinSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginBottom: 20 },
  wheelContainer: { alignItems: 'center', justifyContent: 'center', height: 220, marginBottom: 16 },
  wheel: { width: 200, height: 200, borderRadius: 100, backgroundColor: '#1a2942', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#D4AF37' },
  wheelSegment: { position: 'absolute', width: 200, height: 200, alignItems: 'center' },
  segmentInner: { width: 80, height: 40, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  segmentText: { fontSize: 10, fontFamily: 'DMSans_700Bold', color: '#fff' },
  wheelCenter: { position: 'absolute', width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a2942', borderWidth: 2, borderColor: '#D4AF37', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  wheelPointer: { position: 'absolute', top: 0, zIndex: 20 },
  prizeResult: { alignItems: 'center', marginBottom: 12 },
  prizeText: { fontSize: 22, fontFamily: 'DMSans_700Bold', color: '#4ade80' },
  spinBtn: { backgroundColor: '#6366F1', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  spinBtnDisabled: { backgroundColor: '#374151', opacity: 0.6 },
  spinBtnText: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#fff', letterSpacing: 1 },

  scratchSection: { backgroundColor: '#132D46', borderRadius: 16, padding: 20, marginBottom: 16 },
  scratchHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  scratchTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scratchLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: '#D4AF37', letterSpacing: 1 },
  scratchNewBadge: { backgroundColor: '#EF444420', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  scratchNewText: { fontSize: 10, fontFamily: 'DMSans_700Bold', color: '#EF4444' },
  scratchTitle: { fontSize: 20, fontFamily: 'DMSans_700Bold', color: '#fff', marginBottom: 2 },
  scratchSub: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginBottom: 16 },
  scratchCardBody: { borderRadius: 12, overflow: 'hidden' },
  scratchCardGradient: { padding: 32, alignItems: 'center', justifyContent: 'center', minHeight: 140, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(99,102,241,0.15)' },
  scratchIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#D4AF3720', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  scratchTapText: { fontSize: 16, fontFamily: 'DMSans_600SemiBold', color: '#fff' },
  scratchTapSub: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.gray500, marginTop: 4 },
  scratchPrizeText: { fontSize: 32, fontFamily: 'DMSans_700Bold', color: '#4ade80', marginTop: 8 },
  scratchWonText: { fontSize: 14, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginTop: 4 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: '#fff' },

  missionItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#132D46', borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  missionCompleted: { opacity: 0.5 },
  missionIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  missionInfo: { flex: 1 },
  missionTitle: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#fff' },
  missionTitleDone: { textDecorationLine: 'line-through' as const, color: Colors.light.gray400 },
  missionDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginTop: 2 },
  missionExpiryRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  missionExpiry: { fontSize: 11, fontFamily: 'DMSans_500Medium', color: '#F59E0B' },
  missionPtsCol: { alignItems: 'flex-end', marginLeft: 8 },
  missionOldPts: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.gray500, textDecorationLine: 'line-through' as const },
  missionPts: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: '#4ade80' },
  missionPtsSuffix: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400 },
  mission2xBadge: { backgroundColor: '#4ade8020', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginBottom: 4 },
  mission2xText: { fontSize: 9, fontFamily: 'DMSans_700Bold', color: '#4ade80', letterSpacing: 0.5 },

  badgesSubtitle: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginBottom: 16 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeItem: { width: (SCREEN_W - 64) / 3, backgroundColor: '#132D46', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  badgeLocked: { opacity: 0.4 },
  badgeIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  badgeName: { fontSize: 12, fontFamily: 'DMSans_700Bold', color: '#fff', textAlign: 'center' },
  badgeNameLocked: { color: Colors.light.gray500 },
  badgeDesc: { fontSize: 10, fontFamily: 'DMSans_400Regular', color: Colors.light.gray500, textAlign: 'center', marginTop: 2 },
  badgeCheck: { position: 'absolute', top: 8, right: 8 },

  redeemBalance: { fontSize: 14, fontFamily: 'DMSans_500Medium', color: Colors.light.gray400, marginBottom: 16 },
  rewardsScroll: { marginBottom: 8 },
  rewardsScrollContent: { gap: 12 },
  rewardCard: { width: 140, backgroundColor: '#132D46', borderRadius: 14, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  rewardRedeemed: { opacity: 0.4 },
  rewardIconWrap: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  rewardTitle: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: '#fff', textAlign: 'center', marginBottom: 4 },
  rewardCost: { fontSize: 13, fontFamily: 'DMSans_700Bold', color: '#D4AF37', textAlign: 'center' },

  earnRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#132D46', borderRadius: 12, padding: 14, marginBottom: 8 },
  earnIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  earnLabel: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: '#fff', flex: 1 },
  earnPts: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: '#4ade80' },

  walletCard: { marginBottom: 20 },
  walletCardInner: { borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#D4AF3730' },
  walletHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  walletLogoWrap: { marginRight: 12 },
  walletLogo: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  walletLogoText: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#0C1B2A' },
  walletTokenInfo: { flex: 1 },
  walletTokenName: { fontSize: 18, fontFamily: 'DMSans_700Bold', color: '#D4AF37' },
  walletTokenSub: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400 },
  walletPegBadge: { backgroundColor: '#10B98120', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  walletPegText: { fontSize: 11, fontFamily: 'DMSans_700Bold', color: '#4ade80' },
  walletBalanceLabel: { fontSize: 11, fontFamily: 'DMSans_600SemiBold', color: Colors.light.gray500, letterSpacing: 1, marginBottom: 4 },
  walletBalanceBig: { fontSize: 36, fontFamily: 'DMSans_700Bold', color: '#D4AF37' },
  walletBalanceCurrency: { fontSize: 16, color: Colors.light.gray400 },
  walletBalanceAud: { fontSize: 13, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginTop: 2, marginBottom: 16 },
  walletStatsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 16, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)' },
  walletStatItem: { alignItems: 'center', flex: 1 },
  walletStatLabel: { fontSize: 10, fontFamily: 'DMSans_600SemiBold', color: Colors.light.gray500, letterSpacing: 0.5, marginBottom: 4 },
  walletStatValue: { fontSize: 14, fontFamily: 'DMSans_700Bold', color: '#fff' },
  walletStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.08)' },

  convertSection: { backgroundColor: '#132D46', borderRadius: 16, padding: 20, marginBottom: 16 },
  convertTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#fff', marginBottom: 4 },
  convertDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400, marginBottom: 16 },
  convertInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  convertInputWrap: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#1a2942', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12 },
  convertInput: { flex: 1, height: 44, fontSize: 16, fontFamily: 'DMSans_600SemiBold', color: '#fff' },
  convertInputSuffix: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: Colors.light.gray500 },
  convertOutputWrap: { flex: 1, backgroundColor: '#D4AF3710', borderRadius: 10, borderWidth: 1, borderColor: '#D4AF3730', height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  convertOutputValue: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#D4AF37', flex: 1 },
  convertOutputSuffix: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: '#D4AF37' },
  convertQuickRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  convertQuickBtn: { backgroundColor: '#1a2942', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  convertQuickText: { fontSize: 12, fontFamily: 'DMSans_600SemiBold', color: Colors.light.gray400 },
  convertBtn: { backgroundColor: '#D4AF37', borderRadius: 12, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  convertBtnText: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#0C1B2A' },

  tokenInfoSection: { backgroundColor: '#132D46', borderRadius: 16, padding: 20, marginBottom: 16 },
  tokenInfoTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#fff', marginBottom: 16 },
  tokenInfoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 16 },
  tokenInfoIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  tokenInfoContent: { flex: 1 },
  tokenInfoLabel: { fontSize: 14, fontFamily: 'DMSans_600SemiBold', color: '#fff', marginBottom: 2 },
  tokenInfoDesc: { fontSize: 12, fontFamily: 'DMSans_400Regular', color: Colors.light.gray400 },

  txnSection: { backgroundColor: '#132D46', borderRadius: 16, padding: 20, marginBottom: 16 },
  txnTitle: { fontSize: 16, fontFamily: 'DMSans_700Bold', color: '#fff', marginBottom: 16 },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  txnIconWrap: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#D4AF3715', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  txnInfo: { flex: 1 },
  txnDesc: { fontSize: 13, fontFamily: 'DMSans_500Medium', color: '#fff' },
  txnDate: { fontSize: 11, fontFamily: 'DMSans_400Regular', color: Colors.light.gray500, marginTop: 2 },
  txnAmount: { fontSize: 15, fontFamily: 'DMSans_700Bold', color: '#D4AF37' },
});
