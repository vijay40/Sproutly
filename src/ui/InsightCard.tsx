import { View } from 'react-native';
import { spacing } from '../theme/tokens';
import { Card } from './Card';
import { Body, Label } from './Text';
import { PrimaryButton, TextButton } from './Button';

interface Props {
  text: string;
  onApply?: () => void;
  onDismiss?: () => void;
}

export function InsightCard({ text, onApply, onDismiss }: Props) {
  return (
    <Card variant="insight" style={{ marginBottom: spacing.xxxl }}>
      <Label color="skyInk">INSIGHT</Label>
      <Body color="navyInk" style={{ marginTop: spacing.xs }}>{text}</Body>
      {(onApply || onDismiss) && (
        <View style={{ flexDirection: 'row', gap: spacing.s, marginTop: spacing.sm }}>
          {onApply && <PrimaryButton title="Apply" onPress={onApply} size="sm" />}
          {onDismiss && <TextButton title="Dismiss" color="skyInk" onPress={onDismiss} />}
        </View>
      )}
    </Card>
  );
}
