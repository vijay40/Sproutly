import { useState } from 'react';
import { Pressable, ScrollView, View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { TodayScene } from '../../src/ui/kid/scenes/TodayScene';
import { GreetingScene } from '../../src/ui/kid/scenes/GreetingScene';
import { CelebrationScene } from '../../src/ui/kid/scenes/CelebrationScene';
import { EvolutionScene } from '../../src/ui/kid/scenes/EvolutionScene';
import {
  mockChild,
  mockFamily,
  mockTasks,
  mockCompletionsNone,
  mockCompletionsPartial,
  mockCompletionsAll,
} from '../../src/lib/devMocks';

type SceneKey =
  | 'greeting'
  | 'today-empty'
  | 'today-partial'
  | 'today-all-done'
  | 'evolution'
  | 'celebration';

const SCENES: { key: SceneKey; label: string }[] = [
  { key: 'greeting',        label: 'K2 · Welcome back' },
  { key: 'today-empty',     label: 'K3 · Today (0/3)' },
  { key: 'today-partial',   label: 'K3 · Today (1/3)' },
  { key: 'today-all-done',  label: 'K5 · All done' },
  { key: 'evolution',       label: 'K6 · Evolution' },
  { key: 'celebration',     label: 'K4 · Celebration' },
];

function renderScene(key: SceneKey): React.ReactElement {
  switch (key) {
    case 'greeting':
      return <GreetingScene child={mockChild} />;
    case 'today-empty':
      return <TodayScene tasks={mockTasks} completions={mockCompletionsNone} child={mockChild} family={mockFamily} />;
    case 'today-partial':
      return <TodayScene tasks={mockTasks} completions={mockCompletionsPartial} child={mockChild} family={mockFamily} />;
    case 'today-all-done':
      return <TodayScene tasks={mockTasks} completions={mockCompletionsAll} child={mockChild} family={mockFamily} />;
    case 'evolution':
      return <EvolutionScene from={2} to={3} onComplete={() => {}} />;
    case 'celebration':
      return (
        <CelebrationScene>
          <TodayScene tasks={mockTasks} completions={mockCompletionsPartial} child={mockChild} family={mockFamily} />
        </CelebrationScene>
      );
  }
}

export default function Display() {
  const [active, setActive] = useState<SceneKey>('greeting');
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, backgroundColor: '#F5F6F8', borderBottomWidth: 1, borderBottomColor: '#E8E9EC' }}
        contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: 8, paddingHorizontal: 8, gap: 6 }}
      >
        {SCENES.map((s) => {
          const selected = s.key === active;
          return (
            <Pressable
              key={s.key}
              onPress={() => setActive(s.key)}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 16,
                backgroundColor: selected ? '#5F33E1' : '#FFFFFF',
                borderWidth: 1,
                borderColor: selected ? '#5F33E1' : '#E8E9EC',
              }}
            >
              <Text
                style={{
                  color: selected ? '#FFFFFF' : '#24252C',
                  fontFamily: 'LexendDeca-SemiBold',
                  fontSize: 13,
                }}
              >
                {s.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ flex: 1, position: 'relative' }}>
        {renderScene(active)}
      </View>
    </View>
  );
}
