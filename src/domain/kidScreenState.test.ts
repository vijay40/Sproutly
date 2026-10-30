import { describe, it, expect } from 'vitest';
import { deriveKidState, type KidStateInput } from './kidScreenState';
import type { ChildRow, FamilyRow, TaskRow, TaskCompletionRow } from '../types/db';

const child: ChildRow = {
  id: 'c1', family_id: 'f1', name: 'Aanya', age: 8, avatar_emoji: '🦄',
  successful_days: 12, last_evaluated_date: null,
  pending_stage_transition: false, created_at: '',
};
const family: FamilyRow = { id: 'f1', parent_user_id: null, timezone: 'America/New_York', created_at: '' };
const t = (id: string): TaskRow => ({
  id, child_id: 'c1', title: id, icon: '🦷', category: 'routine', time_slot: 'morning',
  difficulty: 1, recurrence: 'daily', recurrence_days: null, is_bonus: false,
  is_active: true, created_at: '',
});
const done = (taskId: string): TaskCompletionRow => ({
  id: `cmp-${taskId}`, task_id: taskId, child_id: 'c1',
  local_date: '2026-05-09', completed_at: '2026-05-09T10:00:00Z', marked_by_parent: true,
});

const base: KidStateInput = {
  child, family,
  tasks: [t('a'), t('b'), t('c')],
  completions: [],
  pendingEvolution: null,
  network: 'online',
  greetingSlot: null,
  lastEvent: null,
  simplifiedToday: false,
};

describe('deriveKidState', () => {
  it('returns today when nothing special is happening', () => {
    const s = deriveKidState(base);
    expect(s.kind).toBe('today');
  });

  it('evolution wins over everything else', () => {
    const s = deriveKidState({ ...base, pendingEvolution: { fromStage: 2, toStage: 3 }, completions: [done('a'), done('b'), done('c')], greetingSlot: 'morning' });
    expect(s.kind).toBe('evolution');
    if (s.kind === 'evolution') {
      expect(s.from).toBe(2);
      expect(s.to).toBe(3);
    }
  });

  it('celebration preempts today when lastEvent is present', () => {
    const s = deriveKidState({ ...base, lastEvent: { kind: 'completion', taskId: 'a', at: Date.now() } });
    expect(s.kind).toBe('celebration');
    if (s.kind === 'celebration') expect(s.underlying.kind).toBe('today');
  });

  it('celebration preempts greeting', () => {
    const s = deriveKidState({ ...base, greetingSlot: 'morning', lastEvent: { kind: 'completion', taskId: 'a', at: Date.now() } });
    expect(s.kind).toBe('celebration');
  });

  it('greeting wins over today when no celebration', () => {
    const s = deriveKidState({ ...base, greetingSlot: 'afternoon' });
    expect(s.kind).toBe('greeting');
    if (s.kind === 'greeting') expect(s.child.name).toBe('Aanya');
  });

  it('all tasks complete + threshold crossing -> today (hook sets pendingEvolution reactively)', () => {
    const s = deriveKidState({
      ...base,
      child: { ...child, successful_days: 6 },
      completions: [done('a'), done('b'), done('c')],
    });
    expect(s.kind).toBe('today');
  });

  it('all tasks complete + threshold + pendingEvolution -> evolution', () => {
    const s = deriveKidState({
      ...base,
      child: { ...child, successful_days: 6 },
      completions: [done('a'), done('b'), done('c')],
      pendingEvolution: { fromStage: 3, toStage: 4 },
    });
    expect(s.kind).toBe('evolution');
    if (s.kind === 'evolution') {
      expect(s.from).toBe(3);
      expect(s.to).toBe(4);
    }
  });

  it('all tasks complete without threshold stays on today (resting = today)', () => {
    const s = deriveKidState({ ...base, completions: [done('a'), done('b'), done('c')] });
    expect(s.kind).toBe('today');
  });

  it('simplifiedToday routes to simplified kind', () => {
    const s = deriveKidState({ ...base, simplifiedToday: true, tasks: [t('a')] });
    expect(s.kind).toBe('simplified');
    if (s.kind === 'simplified') expect(s.tasks).toHaveLength(1);
  });

  it('offline flag propagates to today', () => {
    const s = deriveKidState({ ...base, network: 'offline' });
    expect(s.kind).toBe('today');
    if (s.kind === 'today') expect(s.offline).toBe(true);
  });

  it('offline flag propagates to today (all done, non-threshold)', () => {
    const s = deriveKidState({
      ...base,
      network: 'offline',
      completions: [done('a'), done('b'), done('c')],
    });
    expect(s.kind).toBe('today');
    if (s.kind === 'today') expect(s.offline).toBe(true);
  });

  it('offline flag propagates to simplified', () => {
    const s = deriveKidState({ ...base, network: 'offline', simplifiedToday: true, tasks: [t('a')] });
    expect(s.kind).toBe('simplified');
    if (s.kind === 'simplified') expect(s.offline).toBe(true);
  });

  it('zero tasks scheduled returns today (not takeover)', () => {
    const s = deriveKidState({ ...base, tasks: [] });
    expect(s.kind).toBe('today');
  });

  it('bonus tasks do not block all-complete (threshold day returns today until hook sets evolution)', () => {
    const bonus: TaskRow = { ...t('bonus'), is_bonus: true };
    const s = deriveKidState({
      ...base,
      child: { ...child, successful_days: 6 },
      tasks: [t('a'), t('b'), t('c'), bonus],
      completions: [done('a'), done('b'), done('c')],
    });
    expect(s.kind).toBe('today');
  });

  it('only-bonus task list does not flip to all-done', () => {
    const bonus: TaskRow = { ...t('bonus'), is_bonus: true };
    const s = deriveKidState({ ...base, tasks: [bonus] });
    expect(s.kind).toBe('today');
  });
});
