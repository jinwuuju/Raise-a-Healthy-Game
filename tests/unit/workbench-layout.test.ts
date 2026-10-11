import { expect, it } from 'vitest';
import { campaignContent } from '../../src/domain/content';
import { nearestWorkbenchSlot, workbenchNodes } from '../../src/ui/workbench-layout';

it('selects the visible slot in every rearranged workbench instead of its obsolete source position', () => {
  for (const q of campaignContent.quests) for (const task of q.tasks) {
    const nodes=workbenchNodes(task);
    task.slots.forEach((s,i)=>expect(nearestWorkbenchSlot(task,nodes.get(s.id)!)).toBe(i));
  }
});
