import { View, Text } from 'react-native';
import type { ChildRow, FamilyRow, TaskRow, TaskCompletionRow } from '../../../types/db';
import { BackgroundBlobs } from '../parts/BackgroundBlobs';
import { TaskRow as TaskRowTile } from '../parts/TaskRow';
import { AvatarOrb } from '../parts/AvatarOrb';
import { ProgressRail } from '../parts/ProgressRail';
import { StreakCard } from '../parts/StreakCard';
import { StageChip } from '../parts/StageChip';
import { HintPill } from '../parts/HintPill';
import { FRAME_H, FRAME_W, kidInk, kidMuted, slotGradients } from '../theme';

const STAGE_NAMES = ['Egg', 'Hatchling', 'Foal', 'Sparky', 'Unicorn', 'Starborn'];

function greetingHeader(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Good morning,';
  if (hour >= 11 && hour < 17) return 'Good afternoon,';
  if (hour >= 17 && hour < 22) return 'Good evening,';
  return 'Hello,';
}

export function TodayScene({
  tasks, completions, child, family, now = new Date(),
}: {
  tasks: TaskRow[];
  completions: TaskCompletionRow[];
  child: ChildRow;
  family: FamilyRow;
  now?: Date;
}) {
  const doneIds = new Set(completions.map((c) => c.task_id));
  const doneCount = tasks.filter((t) => doneIds.has(t.id)).length;
  const total = tasks.length;

  const hour = Number(new Intl.DateTimeFormat('en-US', { timeZone: family.timezone, hour: 'numeric', hour12: false }).format(now));
  const stageName = STAGE_NAMES[child.avatar_stage] ?? 'Sparky';
  const nextIn = Math.max(0, total - doneCount);

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

      {/* Left column */}
      <Text style={{ position: 'absolute', left: 64, top: 72, fontSize: 24, color: kidMuted, fontFamily: 'LexendDeca-Medium' }}>
        {greetingHeader(hour)}
      </Text>
      <Text style={{ position: 'absolute', left: 64, top: 102, fontSize: 48, color: kidInk, fontFamily: 'LexendDeca-Bold' }}>
        {child.name} {child.avatar_emoji ?? '🦄'}
      </Text>
      <Text style={{ position: 'absolute', left: 64, top: 200, fontSize: 14, color: kidMuted, fontFamily: 'LexendDeca-SemiBold', letterSpacing: 1.6 }}>
        TODAY
      </Text>

      {tasks.slice(0, 3).map((t, i) => (
        <View key={t.id} style={{ position: 'absolute', left: 64, top: 230 + i * 120 }}>
          <TaskRowTile task={t} completion={completions.find((c) => c.task_id === t.id) ?? null} />
        </View>
      ))}

      <View style={{ position: 'absolute', left: 64, top: 620 }}>
        <ProgressRail done={doneCount} total={Math.max(total, 1)} />
      </View>
      <View style={{ position: 'absolute', left: 64, top: 710 }}>
        <HintPill text={nextIn > 0 ? `⭐ ${nextIn} more and ${stageName} grows!` : `⭐ Keep it up with ${stageName}!`} />
      </View>

      {/* Right column */}
      <View style={{ position: 'absolute', left: 920, top: 72 }}>
        <StageChip stage={child.avatar_stage} name={stageName} />
      </View>
      <View style={{ position: 'absolute', left: 706, top: 170 }}>
        <AvatarOrb emoji={child.avatar_emoji ?? '🦄'} />
      </View>
      <View style={{ position: 'absolute', left: 706, top: 620 }}>
        <StreakCard streak={child.successful_days} nextIn={Math.max(0, 7 - (child.successful_days % 7))} />
      </View>
    </View>
  );
}
