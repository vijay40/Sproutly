import { ActivityIndicator, View } from 'react-native';
import { useKidScreenState } from '../../src/hooks/useKidScreenState';
import { TodayScene } from '../../src/ui/kid/scenes/TodayScene';
import { GreetingScene } from '../../src/ui/kid/scenes/GreetingScene';
import { AllDoneScene } from '../../src/ui/kid/scenes/AllDoneScene';
import { CelebrationScene } from '../../src/ui/kid/scenes/CelebrationScene';
import { EvolutionScene } from '../../src/ui/kid/scenes/EvolutionScene';
import { CornerOfflineDot } from '../../src/ui/kid/parts/CornerOfflineDot';
import { FRAME_H, FRAME_W } from '../../src/ui/kid/theme';
import type { KidState } from '../../src/domain/kidScreenState';

function renderScene(state: KidState, onEvolutionFinished: () => void): React.ReactElement {
  switch (state.kind) {
    case 'greeting':
      return <GreetingScene slot={state.slot} child={state.child} />;
    case 'today':
      return <TodayScene tasks={state.tasks} completions={state.completions} child={state.child} family={state.family} />;
    case 'simplified':
      return <TodayScene tasks={state.tasks} completions={state.completions} child={state.child} family={state.family} />;
    case 'all-done':
      return <AllDoneScene child={state.child} variant={state.variant} />;
    case 'evolution':
      return <EvolutionScene from={state.from} to={state.to} child={state.child} onComplete={onEvolutionFinished} />;
    case 'celebration':
      return (
        <CelebrationScene>
          {renderScene(state.underlying, onEvolutionFinished)}
        </CelebrationScene>
      );
  }
}

function isOffline(state: KidState): boolean {
  if (state.kind === 'today' || state.kind === 'simplified' || state.kind === 'all-done') return state.offline;
  if (state.kind === 'celebration') return isOffline(state.underlying);
  return false;
}

export default function Display() {
  const { state, ready, onEvolutionFinished } = useKidScreenState();

  if (!ready || !state) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: FRAME_W, height: FRAME_H, position: 'relative' }}>
        {renderScene(state, onEvolutionFinished)}
        {isOffline(state) && <CornerOfflineDot />}
      </View>
    </View>
  );
}
