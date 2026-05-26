import React, { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useReducedMotion } from '@/lib/accessibility';

interface Props {
  visible: boolean;
  onDone: () => void;
}

interface Card {
  emoji: string;
  title: string;
  body: string;
}

const CARDS: Card[] = [
  {
    emoji: '📍',
    title: 'Welcome to AccessMap',
    body: 'Drop a pin where you find an accessibility issue — a missing ramp, a broken sidewalk, a blocked path — so others can plan around it, or help fix it.',
  },
  {
    emoji: '🎯',
    title: 'Severity 1 to 5',
    body: 'When you report a flag, pick how bad it is. 1 is a minor inconvenience, 5 is impassable. The map shows both the number and a color so the meaning is clear even without color vision.',
  },
  {
    emoji: '⭐',
    title: 'Earn points together',
    body: 'You earn points when your reports get verified or resolved by others — and when you verify or resolve theirs. Help build the map.',
  },
];

export default function OnboardingModal({ visible, onDone }: Props) {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView | null>(null);
  const [index, setIndex] = useState(0);
  const reducedMotion = useReducedMotion();

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(CARDS.length - 1, next));
    scrollRef.current?.scrollTo({ x: clamped * width, animated: !reducedMotion });
    setIndex(clamped);
  };

  const handleScroll = (e: { nativeEvent: { contentOffset: { x: number } } }) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (next !== index) setIndex(next);
  };

  const isLast = index === CARDS.length - 1;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onDone}
      presentationStyle="fullScreen"
    >
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable
            onPress={onDone}
            style={styles.skipBtn}
            accessibilityRole="button"
            accessibilityLabel="Skip the introduction"
            hitSlop={12}
          >
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={handleScroll}
          style={styles.scroll}
        >
          {CARDS.map((card, i) => (
            <View
              key={card.title}
              style={[styles.card, { width }]}
              accessible
              accessibilityRole="text"
              accessibilityLabel={`Step ${i + 1} of ${CARDS.length}. ${card.title}. ${card.body}`}
            >
              <Text style={styles.emoji} accessibilityElementsHidden importantForAccessibility="no">
                {card.emoji}
              </Text>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={styles.body}>{card.body}</Text>
            </View>
          ))}
        </ScrollView>

        <View
          style={styles.dotsRow}
          accessibilityRole="text"
          accessibilityLabel={`Step ${index + 1} of ${CARDS.length}`}
        >
          {CARDS.map((card, i) => (
            <View
              key={card.title}
              style={[styles.dot, i === index && styles.dotActive]}
              importantForAccessibility="no"
              accessibilityElementsHidden
            />
          ))}
        </View>

        <View style={styles.actions}>
          {!isLast ? (
            <Pressable
              onPress={() => goTo(index + 1)}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel={`Next step. Currently on step ${index + 1} of ${CARDS.length}.`}
            >
              <Text style={styles.primaryBtnText}>Next</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={onDone}
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
              accessibilityRole="button"
              accessibilityLabel="Get started using AccessMap"
            >
              <Text style={styles.primaryBtnText}>Get started</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#fff',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 48,
    paddingBottom: 8,
  },
  skipBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipText: { color: '#666', fontWeight: '600', fontSize: 14 },
  scroll: { flex: 1 },
  card: {
    flex: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  emoji: { fontSize: 72, textAlign: 'center' },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 360,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d0d4dc',
  },
  dotActive: { backgroundColor: '#2f80ed', width: 22 },
  actions: {
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 8,
  },
  primaryBtn: {
    backgroundColor: '#2f80ed',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  btnPressed: { opacity: 0.85 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
