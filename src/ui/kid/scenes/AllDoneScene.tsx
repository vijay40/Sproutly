import { View, Text } from 'react-native';
import type { ChildRow } from '../../../types/db';
import { BackgroundBlobs } from '../parts/BackgroundBlobs';
import { AvatarOrb } from '../parts/AvatarOrb';
import { ProgressRail } from '../parts/ProgressRail';
import { StageChip } from '../parts/StageChip';
import { StreakCard } from '../parts/StreakCard';
import { FRAME_H, FRAME_W, kidInk, kidMuted, slotGradients } from '../theme';

const STAGE_NAMES = ['Egg', 'Hatchling', 'Foal', 'Sparky', 'Unicorn', 'Starborn'];

export function AllDoneScene({
  child, variant,
}: {
  child: ChildRow;
  variant: 'takeover' | 'resting';
}) {
  const stageName = STAGE_NAMES[child.avatar_stage] ?? 'Sparky';

  return (
    <View
      style={{
        width: FRAME_W,
        height: FRAME_H,
        backgroundColor: slotGradients.default.from,
        borderRadius: 40,
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <BackgroundBlobs />

      {/* Left column: celebratory copy */}
      <Text style={{ position: 'absolute', left: 64, top: 200, fontSize: 52, color: kidInk, fontFamily: 'LexendDeca-Bold' }}>
        All done for today! 🎉
      </Text>
      {variant === 'takeover' ? (
        <Text style={{ position: 'absolute', left: 64, top: 290, fontSize: 28, color: kidMuted, fontFamily: 'LexendDeca-Medium' }}>
          Something magical happens tomorrow ✨
        </Text>
      ) : (
        <Text style={{ position: 'absolute', left: 64, top: 290, fontSize: 24, color: kidMuted, fontFamily: 'LexendDeca-Regular' }}>
          Great job!
        </Text>
      )}

      <View style={{ position: 'absolute', left: 64, top: 620 }}>
        <ProgressRail done={1} total={1} />
      </View>

      {/* Right column */}
      <View style={{ position: 'absolute', left: 920, top: 72 }}>
        <StageChip stage={child.avatar_stage} name={stageName} />
      </View>
      <View style={{ position: 'absolute', left: 706, top: 170 }}>
        <AvatarOrb emoji={child.avatar_emoji ?? '🦄'} aura={variant === 'takeover' ? 'pulse' : null} />
      </View>
      <View style={{ position: 'absolute', left: 706, top: 620 }}>
        <StreakCard streak={child.successful_days + 1} nextIn={Math.max(0, 7 - ((child.successful_days + 1) % 7))} />
      </View>
    </View>
  );
}
