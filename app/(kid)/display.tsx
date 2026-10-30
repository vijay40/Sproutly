import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useKidScreenState } from '../../src/hooks/useKidScreenState';
import type { KidState } from '../../src/domain/kidScreenState';
import type { TaskRow } from '../../src/types/db';
import { GreetingScene } from '../../src/ui/kid/scenes/GreetingScene';
import { TodayScene } from '../../src/ui/kid/scenes/TodayScene';
import { CelebrationScene } from '../../src/ui/kid/scenes/CelebrationScene';
import { EvolutionScene } from '../../src/ui/kid/scenes/EvolutionScene';

function renderUnderlying(
  state: KidState,
  onEvolutionFinished: () => void,
  onIncomplete: (task: TaskRow) => void,
): React.ReactNode {
  // Resolve to the non-celebration state so the scene below the overlay stays
  // continuously mounted while celebration is on screen. Without this, wrapping
  // TodayScene in <CelebrationScene>{...}</CelebrationScene> remounts it on
  // every completion — which resets the FLIP animation refs and makes per-task
  // reorders snap instantly.
  const s = state.kind === 'celebration' ? state.underlying : state;
  switch (s.kind) {
    case 'greeting':
      return <GreetingScene child={s.child} />;
    case 'today':
    case 'simplified':
    case 'takeover':
      return (
        <TodayScene
          tasks={s.tasks}
          completions={s.completions}
          child={s.child}
          family={s.family}
          onIncompleteTaskPress={onIncomplete}
        />
      );
    case 'evolution':
      return <EvolutionScene from={s.from} to={s.to} onComplete={onEvolutionFinished} />;
    case 'celebration':
      return null;
  }
}

export default function Display() {
  const { state, ready, onEvolutionFinished, completeTask } = useKidScreenState();

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!state) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }} />
    );
  }

  const onIncomplete = (t: TaskRow) => void completeTask(t.id);

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      {renderUnderlying(state, onEvolutionFinished, onIncomplete)}
      {state.kind === 'celebration' && <CelebrationScene allDone={state.allDone} />}
    </View>
  );
}
