import { Label } from './Text';
import { spacing } from '../theme/tokens';

export function SlotLabel({ children }: { children: string }) {
  return <Label style={{ marginBottom: spacing.sm, marginTop: spacing.lg }}>{children}</Label>;
}
