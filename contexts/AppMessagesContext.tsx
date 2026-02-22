import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, ReactNode, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Pressable, Dimensions, Animated as RNAnimated } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getApiUrl } from '@/lib/query-client';
import Colors from '@/constants/colors';

const STORAGE_KEY = 'good_money_seen_messages';
const { width: SCREEN_W } = Dimensions.get('window');

interface AppMessage {
  id: number;
  message_id: string;
  type: 'tooltip' | 'popup' | 'ftue';
  title: string;
  body: string | null;
  cta_text: string | null;
  cta_action: string | null;
  target_screen: string;
  position: string;
  icon: string | null;
  icon_color: string;
  bg_color: string;
  display_rule: 'once' | 'every_session' | 'every_time' | 'first_time_only';
  priority: number;
  delay_ms: number;
  is_active: boolean;
  sort_order: number;
}

interface AppMessagesContextValue {
  messages: AppMessage[];
  getMessagesForScreen: (screenName: string) => AppMessage[];
  dismissMessage: (messageId: string) => void;
  resetMessages: () => void;
}

const AppMessagesContext = createContext<AppMessagesContextValue | null>(null);

export function useAppMessages() {
  const ctx = useContext(AppMessagesContext);
  if (!ctx) throw new Error('useAppMessages must be used within AppMessagesProvider');
  return ctx;
}

export function AppMessagesProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<AppMessage[]>([]);
  const [seenIds, setSeenIds] = useState<string[]>([]);
  const [sessionDismissed, setSessionDismissed] = useState<Set<string>>(new Set());
  const loaded = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) setSeenIds(JSON.parse(stored));
      } catch {}
      try {
        const url = new URL('/api/admin/messages/active', getApiUrl());
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setMessages(data);
        }
      } catch {}
      loaded.current = true;
    })();
  }, []);

  const dismissMessage = useCallback(async (messageId: string) => {
    const msg = messages.find(m => m.message_id === messageId);
    if (!msg) return;

    if (msg.display_rule === 'every_session') {
      setSessionDismissed(prev => new Set(prev).add(messageId));
    } else {
      const updated = [...seenIds, messageId];
      setSeenIds(updated);
      try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)); } catch {}
    }
  }, [messages, seenIds]);

  const resetMessages = useCallback(async () => {
    setSeenIds([]);
    setSessionDismissed(new Set());
    try { await AsyncStorage.removeItem(STORAGE_KEY); } catch {}
  }, []);

  const getMessagesForScreen = useCallback((screenName: string) => {
    return messages.filter(m => {
      if (m.target_screen !== 'all' && m.target_screen !== screenName) return false;
      if (m.display_rule === 'first_time_only' && seenIds.includes(m.message_id)) return false;
      if (m.display_rule === 'once' && seenIds.includes(m.message_id)) return false;
      if (m.display_rule === 'every_session' && sessionDismissed.has(m.message_id)) return false;
      return true;
    });
  }, [messages, seenIds, sessionDismissed]);

  const value = useMemo(() => ({
    messages,
    getMessagesForScreen,
    dismissMessage,
    resetMessages,
  }), [messages, getMessagesForScreen, dismissMessage, resetMessages]);

  return (
    <AppMessagesContext.Provider value={value}>
      {children}
    </AppMessagesContext.Provider>
  );
}

function AppTooltip({ message, onDismiss }: { message: AppMessage; onDismiss: () => void }) {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      RNAnimated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }, message.delay_ms);
    return () => clearTimeout(t);
  }, []);

  return (
    <RNAnimated.View style={[ttStyles.container, { opacity: fadeAnim, transform: [{ translateY: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }]}>
      <View style={[ttStyles.card, { backgroundColor: message.bg_color || '#132D46' }]}>
        <Pressable style={ttStyles.close} onPress={onDismiss} hitSlop={12}>
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.6)" />
        </Pressable>
        <View style={ttStyles.row}>
          {message.icon && (
            <View style={[ttStyles.iconWrap, { backgroundColor: (message.icon_color || '#0D9488') + '20' }]}>
              <Ionicons name={message.icon as any} size={20} color={message.icon_color || '#0D9488'} />
            </View>
          )}
          <View style={ttStyles.textWrap}>
            <Text style={ttStyles.title}>{message.title}</Text>
            {message.body && <Text style={ttStyles.body}>{message.body}</Text>}
          </View>
        </View>
        {message.cta_text && (
          <Pressable style={[ttStyles.cta, { backgroundColor: message.icon_color || '#0D9488' }]} onPress={() => {
            if (message.cta_action) {
              try { router.push(`/(tabs)/${message.cta_action}` as any); } catch {}
            }
            onDismiss();
          }}>
            <Text style={ttStyles.ctaText}>{message.cta_text}</Text>
          </Pressable>
        )}
      </View>
    </RNAnimated.View>
  );
}

const ttStyles = StyleSheet.create({
  container: { position: 'absolute', bottom: 140, left: 16, right: 16, zIndex: 999 },
  card: { borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 8 },
  close: { position: 'absolute', top: 10, right: 10, zIndex: 1 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingRight: 20 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  textWrap: { flex: 1 },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#fff', marginBottom: 4 },
  body: { fontFamily: 'DMSans_400Regular', fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  cta: { marginTop: 12, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  ctaText: { fontFamily: 'DMSans_600SemiBold', fontSize: 13, color: '#fff' },
});

function AppPopup({ message, onDismiss }: { message: AppMessage; onDismiss: () => void }) {
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const scaleAnim = useRef(new RNAnimated.Value(0.9)).current;

  useEffect(() => {
    const t = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.spring(scaleAnim, { toValue: 1, friction: 8, useNativeDriver: true }),
      ]).start();
    }, message.delay_ms);
    return () => clearTimeout(t);
  }, []);

  const handleCTA = () => {
    if (message.cta_action) {
      try { router.push(`/(tabs)/${message.cta_action}` as any); } catch {}
    }
    onDismiss();
  };

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDismiss}>
      <RNAnimated.View style={[popStyles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <RNAnimated.View style={[popStyles.card, { backgroundColor: message.bg_color || '#132D46', transform: [{ scale: scaleAnim }] }]}>
          <Pressable style={popStyles.closeBtn} onPress={onDismiss} hitSlop={12}>
            <Ionicons name="close-circle" size={28} color="rgba(255,255,255,0.4)" />
          </Pressable>
          {message.icon && (
            <View style={[popStyles.iconCircle, { backgroundColor: (message.icon_color || '#0D9488') + '20' }]}>
              <Ionicons name={message.icon as any} size={36} color={message.icon_color || '#0D9488'} />
            </View>
          )}
          <Text style={popStyles.title}>{message.title}</Text>
          {message.body && <Text style={popStyles.body}>{message.body}</Text>}
          {message.cta_text && (
            <Pressable style={[popStyles.cta, { backgroundColor: message.icon_color || '#0D9488' }]} onPress={handleCTA}>
              <Text style={popStyles.ctaText}>{message.cta_text}</Text>
            </Pressable>
          )}
        </RNAnimated.View>
      </RNAnimated.View>
    </Modal>
  );
}

const popStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  card: { borderRadius: 24, padding: 32, width: '100%', maxWidth: 360, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.4, shadowRadius: 24, elevation: 12 },
  closeBtn: { position: 'absolute', top: 12, right: 12, zIndex: 1 },
  iconCircle: { width: 72, height: 72, borderRadius: 24, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 22, color: '#fff', textAlign: 'center', marginBottom: 12 },
  body: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  cta: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, width: '100%', alignItems: 'center' },
  ctaText: { fontFamily: 'DMSans_700Bold', fontSize: 16, color: '#fff' },
});

function AppFTUE({ messages, currentIndex, onDismiss, onNext }: { messages: AppMessage[]; currentIndex: number; onDismiss: () => void; onNext: () => void }) {
  const msg = messages[currentIndex];
  const fadeAnim = useRef(new RNAnimated.Value(0)).current;
  const slideAnim = useRef(new RNAnimated.Value(30)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(30);
    const t = setTimeout(() => {
      RNAnimated.parallel([
        RNAnimated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        RNAnimated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }, currentIndex === 0 ? msg.delay_ms : 200);
    return () => clearTimeout(t);
  }, [currentIndex]);

  const isLast = currentIndex === messages.length - 1;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onDismiss}>
      <RNAnimated.View style={[ftueStyles.overlay, { opacity: fadeAnim }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onDismiss} />
        <RNAnimated.View style={[ftueStyles.card, { backgroundColor: msg.bg_color || '#132D46', transform: [{ translateY: slideAnim }] }]}>
          <View style={ftueStyles.stepBadge}>
            <Text style={ftueStyles.stepText}>{currentIndex + 1}/{messages.length}</Text>
          </View>
          <Pressable style={ftueStyles.closeBtn} onPress={onDismiss} hitSlop={12}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.5)" />
          </Pressable>
          {msg.icon && (
            <View style={[ftueStyles.iconCircle, { backgroundColor: (msg.icon_color || '#3B82F6') + '20' }]}>
              <Ionicons name={msg.icon as any} size={32} color={msg.icon_color || '#3B82F6'} />
            </View>
          )}
          <Text style={ftueStyles.title}>{msg.title}</Text>
          {msg.body && <Text style={ftueStyles.body}>{msg.body}</Text>}
          <Pressable style={[ftueStyles.nextBtn, { backgroundColor: msg.icon_color || '#3B82F6' }]} onPress={isLast ? onDismiss : onNext}>
            <Text style={ftueStyles.nextText}>{msg.cta_text || (isLast ? 'Got It' : 'Next')}</Text>
          </Pressable>
          <View style={ftueStyles.dots}>
            {messages.map((_, i) => (
              <View key={i} style={[ftueStyles.dot, i === currentIndex && { backgroundColor: msg.icon_color || '#3B82F6', width: 20 }]} />
            ))}
          </View>
        </RNAnimated.View>
      </RNAnimated.View>
    </Modal>
  );
}

const ftueStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 28 },
  card: { borderRadius: 24, padding: 32, width: '100%', maxWidth: 360, alignItems: 'center', position: 'relative' },
  stepBadge: { position: 'absolute', top: 16, left: 16, backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  stepText: { fontFamily: 'DMSans_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  closeBtn: { position: 'absolute', top: 14, right: 14, zIndex: 1 },
  iconCircle: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 20, marginTop: 12 },
  title: { fontFamily: 'DMSans_700Bold', fontSize: 20, color: '#fff', textAlign: 'center', marginBottom: 10 },
  body: { fontFamily: 'DMSans_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.75)', textAlign: 'center', lineHeight: 22, marginBottom: 24 },
  nextBtn: { paddingVertical: 14, paddingHorizontal: 40, borderRadius: 14, width: '100%', alignItems: 'center', marginBottom: 20 },
  nextText: { fontFamily: 'DMSans_700Bold', fontSize: 15, color: '#fff' },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' },
});

export function MessageOverlay({ screen }: { screen: string }) {
  const { getMessagesForScreen, dismissMessage } = useAppMessages();
  const [ftueIndex, setFtueIndex] = useState(0);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [delayReady, setDelayReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDelayReady(true), 300);
    return () => clearTimeout(t);
  }, []);

  const screenMessages = getMessagesForScreen(screen);
  const visibleMessages = screenMessages.filter(m => !dismissed.has(m.message_id));

  const handleDismiss = useCallback((msgId: string) => {
    dismissMessage(msgId);
    setDismissed(prev => new Set(prev).add(msgId));
  }, [dismissMessage]);

  if (!delayReady || visibleMessages.length === 0) return null;

  const popups = visibleMessages.filter(m => m.type === 'popup');
  const tooltips = visibleMessages.filter(m => m.type === 'tooltip');
  const ftues = visibleMessages.filter(m => m.type === 'ftue');

  if (popups.length > 0) {
    const popup = popups[0];
    return <AppPopup message={popup} onDismiss={() => handleDismiss(popup.message_id)} />;
  }

  if (ftues.length > 0) {
    return (
      <AppFTUE
        messages={ftues}
        currentIndex={Math.min(ftueIndex, ftues.length - 1)}
        onDismiss={() => {
          ftues.forEach(f => handleDismiss(f.message_id));
          setFtueIndex(0);
        }}
        onNext={() => {
          if (ftueIndex < ftues.length - 1) {
            handleDismiss(ftues[ftueIndex].message_id);
            setFtueIndex(prev => prev + 1);
          }
        }}
      />
    );
  }

  if (tooltips.length > 0) {
    const tooltip = tooltips[0];
    return <AppTooltip message={tooltip} onDismiss={() => handleDismiss(tooltip.message_id)} />;
  }

  return null;
}
