import { View, Text, ScrollView, useWindowDimensions } from 'react-native';
import type { ChildRow, FamilyRow, TaskRow, TaskCompletionRow } from '../../../types/db';
import { KidBackgroundPurple } from '../parts/KidBackground';
import { TaskRow as TaskRowTile } from '../parts/TaskRow';
import { AvatarCircle } from '../parts/AvatarCircle';
import { ProgressRail } from '../parts/ProgressRail';
import { StreakCard } from '../parts/StreakCard';
import { StageChip } from '../parts/StageChip';
import { HintPill } from '../parts/HintPill';
import { ExitLock } from '../parts/ExitLock';
import { kidInk, kidMuted, stageEmoji, stageName } from '../theme';

function greetingHeader(hour: number): string {
  if (hour >= 5 && hour < 11) return 'Good morning,';
  if (hour >= 11 && hour < 17) return 'Good afternoon,';
  if (hour >= 17 && hour < 22) return 'Good evening,';
  return 'Hello,';
}

interface Props {
  tasks: TaskRow[];
  completions: TaskCompletionRow[];
  child: ChildRow;
  family: FamilyRow;
  now?: Date;
}

export function TodayScene(props: Props) {
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const small = width < 600;
  return (
    <View style={{ flex: 1 }}>
      {small ? (
        <SmallPortraitLayout {...props} width={width} />
      ) : landscape ? (
        <LandscapeLayout {...props} />
      ) : (
        <PortraitLayout {...props} />
      )}
      <ExitLock size={small ? 32 : 44} />
    </View>
  );
}

function useCommon({ tasks, completions, child, family, now = new Date() }: Props) {
  const doneIds = new Set(completions.map((c) => c.task_id));
  const doneCount = tasks.filter((t) => doneIds.has(t.id)).length;
  const total = tasks.length;
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { timeZone: family.timezone, hour: 'numeric', hour12: false }).format(now),
  );
  const allDone = total > 0 && doneCount === total;
  return {
    doneCount,
    total,
    hour,
    allDone,
    stage: stageName(child.avatar_stage),
    emoji: stageEmoji(child.avatar_stage),
    nextIn: Math.max(0, total - doneCount),
  };
}

// Fixed content height for landscape — the right column uses Figma absolute
// coordinates anchored to this. Extra tasks push the total content height past
// this value, which is why the whole screen needs to scroll.
const LANDSCAPE_BASE_H = 834;
const TASK_ROW_H = 81;
const TASK_GAP = 10;

function LandscapeLayout(props: Props) {
  const { tasks, completions, child } = props;
  const { doneCount, total, hour, allDone, stage, emoji, nextIn } = useCommon(props);

  // Tasks start at y=230; progress+hint need ~200 below that. Expand content
  // height if 3+ tasks would push past the base frame height.
  const tasksHeight = tasks.length * TASK_ROW_H + Math.max(0, tasks.length - 1) * TASK_GAP;
  const bottomStackH = 56 + 10 + 44; // progress + gap + hint
  const neededH = 230 + tasksHeight + 20 + bottomStackH + 72;
  const contentH = Math.max(LANDSCAPE_BASE_H, neededH);

  return (
    <View style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      <KidBackgroundPurple />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ height: contentH }}
        showsVerticalScrollIndicator={false}
      >
        {/* Left column — flow layout anchored via absolute left */}
        <View style={{ position: 'absolute', left: 64, top: 72, width: 640 }}>
          {allDone ? (
            <>
              <Text style={{ fontSize: 44, lineHeight: 52, color: kidInk, fontFamily: 'LexendDeca-Bold' }}>
                All done today
              </Text>
              <Text style={{ marginTop: 8, fontSize: 18, lineHeight: 24, color: kidMuted, fontFamily: 'LexendDeca-Regular' }}>
                See you tomorrow, {child.name} {emoji}
              </Text>
            </>
          ) : (
            <>
              <Text style={{ fontSize: 24, color: kidMuted, fontFamily: 'LexendDeca-Medium' }}>{greetingHeader(hour)}</Text>
              <Text style={{ marginTop: 6, fontSize: 48, color: kidInk, fontFamily: 'LexendDeca-Bold' }}>
                {child.name} {emoji}
              </Text>
            </>
          )}
          <Text
            style={{
              marginTop: 50,
              fontSize: 14,
              color: kidMuted,
              fontFamily: 'LexendDeca-SemiBold',
              letterSpacing: 1.6,
            }}
          >
            TODAY
          </Text>

          <View style={{ marginTop: 12, gap: TASK_GAP }}>
            {tasks.map((t) => (
              <TaskRowTile key={t.id} task={t} completion={completions.find((c) => c.task_id === t.id) ?? null} />
            ))}
          </View>

          <View style={{ marginTop: 20, gap: 10 }}>
            <ProgressRail done={doneCount} total={Math.max(total, 1)} />
            <HintPill text={nextIn > 0 ? `⭐ ${nextIn} more and ${stage} grows!` : `⭐ Keep it up with ${stage}!`} />
          </View>
        </View>

        {/* Right column */}
        <View style={{ position: 'absolute', left: 920, top: 72 }}>
          <StageChip stage={child.avatar_stage} name={stage} />
        </View>
        <View style={{ position: 'absolute', left: 706, top: 170 }}>
          <AvatarCircle emoji={emoji} size={300} />
        </View>
        <View style={{ position: 'absolute', left: 706, top: 620 }}>
          <StreakCard streak={child.successful_days} nextIn={Math.max(0, 7 - (child.successful_days % 7))} />
        </View>
      </ScrollView>
    </View>
  );
}

function SmallPortraitLayout(props: Props & { width: number }) {
  const { tasks, completions, child, width } = props;
  const { doneCount, total, hour, allDone, stage, emoji, nextIn } = useCommon(props);
  const rowW = width - 44;

  return (
    <View style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      <KidBackgroundPurple />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 22, paddingTop: 66, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flexShrink: 1 }}>
            {allDone ? (
              <>
                <Text style={{ fontSize: 24, lineHeight: 30, color: kidInk, fontFamily: 'LexendDeca-Bold' }}>
                  All done today
                </Text>
                <Text style={{ marginTop: 4, fontSize: 13, lineHeight: 18, color: kidMuted, fontFamily: 'LexendDeca-Regular' }}>
                  See you tomorrow, {child.name} {emoji}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 14, color: kidMuted, fontFamily: 'LexendDeca-Medium' }}>
                  {greetingHeader(hour)}
                </Text>
                <Text style={{ fontSize: 22, lineHeight: 28, color: kidInk, fontFamily: 'LexendDeca-Bold', marginTop: 2 }}>
                  {child.name} {emoji}
                </Text>
              </>
            )}
          </View>
          <StageChip stage={child.avatar_stage} name={stage} compact />
        </View>

        <View style={{ alignItems: 'center', marginTop: 16 }}>
          <AvatarCircle emoji={emoji} size={120} />
        </View>

        <Text
          style={{
            marginTop: 20,
            fontSize: 11,
            color: kidMuted,
            fontFamily: 'LexendDeca-SemiBold',
            letterSpacing: 1.5,
          }}
        >
          TODAY
        </Text>

        <View style={{ marginTop: 10, gap: 10 }}>
          {tasks.map((t) => (
            <TaskRowTile
              key={t.id}
              task={t}
              completion={completions.find((c) => c.task_id === t.id) ?? null}
              width={rowW}
            />
          ))}
        </View>

        <View style={{ marginTop: 20, gap: 12 }}>
          <ProgressRail done={doneCount} total={Math.max(total, 1)} width={rowW} compact />
          <View style={{ alignItems: 'center' }}>
            <HintPill text={nextIn > 0 ? `⭐ ${nextIn} more and ${stage} grows!` : `⭐ Keep it up with ${stage}!`} />
          </View>
          <StreakCard
            streak={child.successful_days}
            nextIn={Math.max(0, 7 - (child.successful_days % 7))}
            width={rowW}
            compact
          />
        </View>
      </ScrollView>
    </View>
  );
}

function PortraitLayout(props: Props) {
  const { tasks, completions, child } = props;
  const { doneCount, total, hour, allDone, stage, emoji, nextIn } = useCommon(props);

  return (
    <View style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
      <KidBackgroundPurple />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 64, paddingTop: 72, paddingBottom: 48 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row: greeting + stage chip */}
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <View style={{ flexShrink: 1 }}>
            {allDone ? (
              <>
                <Text style={{ fontSize: 40, lineHeight: 48, color: kidInk, fontFamily: 'LexendDeca-Bold' }}>
                  All done today
                </Text>
                <Text style={{ marginTop: 8, fontSize: 18, lineHeight: 24, color: kidMuted, fontFamily: 'LexendDeca-Regular' }}>
                  See you tomorrow, {child.name} {emoji}
                </Text>
              </>
            ) : (
              <>
                <Text style={{ fontSize: 20, color: kidMuted, fontFamily: 'LexendDeca-Medium' }}>
                  {greetingHeader(hour)}
                </Text>
                <Text style={{ fontSize: 40, lineHeight: 48, color: kidInk, fontFamily: 'LexendDeca-Bold', marginTop: 4 }}>
                  {child.name} {emoji}
                </Text>
              </>
            )}
          </View>
          <StageChip stage={child.avatar_stage} name={stage} />
        </View>

        {/* Centered avatar */}
        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <AvatarCircle emoji={emoji} size={300} />
        </View>

        {/* TODAY + task rows */}
        <Text
          style={{
            marginTop: 24,
            fontSize: 14,
            color: kidMuted,
            fontFamily: 'LexendDeca-SemiBold',
            letterSpacing: 1.6,
          }}
        >
          TODAY
        </Text>

        <View style={{ marginTop: 12, gap: 12 }}>
          {tasks.map((t) => (
            <TaskRowTile
              key={t.id}
              task={t}
              completion={completions.find((c) => c.task_id === t.id) ?? null}
              width={706}
            />
          ))}
        </View>

        {/* Progress + hint + streak stack */}
        <View style={{ marginTop: 24, gap: 16 }}>
          <ProgressRail done={doneCount} total={Math.max(total, 1)} width={706} />
          <HintPill text={nextIn > 0 ? `⭐ ${nextIn} more and ${stage} grows!` : `⭐ Keep it up with ${stage}!`} />
          <StreakCard
            streak={child.successful_days}
            nextIn={Math.max(0, 7 - (child.successful_days % 7))}
            width={706}
          />
        </View>
      </ScrollView>
    </View>
  );
}
