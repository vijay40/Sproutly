import { useMemo, useState } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';
import { colors, radii, spacing } from '../theme/tokens';
import { BodyEmphasis, Caption, Text } from './Text';
import { BottomSheet } from './BottomSheet';
import { CheckIcon, SearchIcon } from './icons';
import { tapLight } from '../lib/haptics';
import {
  friendlyLabel,
  getAllZones,
  gmtOffset,
  groupByContinent,
  searchZones,
} from '../lib/timezones';

interface Props {
  visible: boolean;
  value: string | null;
  detectedZone?: string | null;
  onSelect: (tz: string) => void;
  onClose: () => void;
}

function OffsetChip({ tz }: { tz: string }) {
  const offset = gmtOffset(tz);
  if (!offset) return null;
  return (
    <View
      style={{
        backgroundColor: colors.purpleWash,
        borderRadius: radii.pill,
        paddingHorizontal: 10,
        paddingVertical: 4,
      }}
    >
      <Text
        style={{
          fontFamily: 'LexendDeca-SemiBold',
          fontSize: 12,
          color: colors.purple,
        }}
      >
        {offset}
      </Text>
    </View>
  );
}

interface RowProps {
  tz: string;
  active: boolean;
  hint?: string;
  onPress: () => void;
}
function ZoneRow({ tz, active, hint, onPress }: RowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={friendlyLabel(tz)}
      accessibilityState={{ selected: active }}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        borderRadius: radii.card,
        backgroundColor: active ? colors.purpleWash : pressed ? colors.gray50 : colors.white,
        marginBottom: spacing.xxs,
      })}
    >
      <View style={{ flex: 1 }}>
        <Text kind="bodyEmphasis" color={active ? 'purple' : 'ink'}>
          {friendlyLabel(tz)}
        </Text>
        <Caption style={{ marginTop: 2 }}>{hint ?? tz}</Caption>
      </View>
      {active ? <CheckIcon size={18} color={colors.purple} /> : <OffsetChip tz={tz} />}
    </Pressable>
  );
}

export function TimezonePickerSheet({
  visible,
  value,
  detectedZone,
  onSelect,
  onClose,
}: Props) {
  const [query, setQuery] = useState('');
  const allZones = useMemo(() => getAllZones(), []);
  const filtered = useMemo(() => searchZones(allZones, query), [allZones, query]);
  const grouped = useMemo(() => groupByContinent(filtered), [filtered]);
  const showDetected = !query && detectedZone && allZones.includes(detectedZone);

  function pick(tz: string) {
    tapLight();
    onSelect(tz);
    onClose();
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} maxHeight={640}>
      <BodyEmphasis style={{ textAlign: 'center', marginBottom: spacing.md }}>
        Timezone
      </BodyEmphasis>

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.gray50,
          borderRadius: radii.input,
          paddingHorizontal: spacing.md,
          height: 44,
          marginBottom: spacing.md,
        }}
      >
        <SearchIcon size={16} color={colors.muted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search cities or zones"
          placeholderTextColor={colors.muted}
          autoCorrect={false}
          autoCapitalize="none"
          style={{
            flex: 1,
            marginLeft: spacing.s,
            fontFamily: 'LexendDeca-Regular',
            fontSize: 14,
            color: colors.ink,
            paddingVertical: 0,
          }}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {showDetected ? (
          <View style={{ marginBottom: spacing.md }}>
            <Caption
              style={{
                fontFamily: 'LexendDeca-SemiBold',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: spacing.xs,
                marginLeft: spacing.md,
              }}
            >
              Detected
            </Caption>
            <ZoneRow
              tz={detectedZone!}
              active={value === detectedZone}
              hint={`${detectedZone} · Your device timezone`}
              onPress={() => pick(detectedZone!)}
            />
          </View>
        ) : null}

        {grouped.map((group) => (
          <View key={group.continent} style={{ marginBottom: spacing.md }}>
            <Caption
              style={{
                fontFamily: 'LexendDeca-SemiBold',
                letterSpacing: 1.2,
                textTransform: 'uppercase',
                marginBottom: spacing.xs,
                marginLeft: spacing.md,
              }}
            >
              {group.continent}
            </Caption>
            {group.zones.map((tz) => (
              <ZoneRow
                key={tz}
                tz={tz}
                active={tz === value}
                onPress={() => pick(tz)}
              />
            ))}
          </View>
        ))}
      </ScrollView>
    </BottomSheet>
  );
}
