import { Label } from './Text';
import { spacing } from '../theme/tokens';

export function SlotLabel({ children }: { children: string }) {
  return <Label style={{ marginBottom: spacing.sm, paddingLeft: spacing.xxs }}>{children}</Label>;
}
