import { PairCode } from './PairCode';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit?: () => void;
}

/** Entry-mode wrapper around {@link PairCode} — kept for call-site stability. */
export function CodeEntry({ value, onChange, onSubmit }: Props) {
  return <PairCode mode="entry" value={value} onChange={onChange} onSubmit={onSubmit} />;
}
