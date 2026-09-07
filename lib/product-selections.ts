import type { CartItemSelection } from '@/types';

export function applyChoiceChecked(
  selections: CartItemSelection[],
  groupId: string,
  choiceId: string,
  max: number,
  checked: boolean
): CartItemSelection[] {
  return selections.map((sel) => {
    if (sel.optionGroupId !== groupId) return sel;
    if (!checked) {
      return { ...sel, choices: sel.choices.filter((c) => c !== choiceId) };
    }
    if (sel.choices.includes(choiceId)) return sel;
    if (max <= 1) {
      return { ...sel, choices: [choiceId] };
    }
    if (sel.choices.length >= max) return sel;
    return { ...sel, choices: [...sel.choices, choiceId] };
  });
}
