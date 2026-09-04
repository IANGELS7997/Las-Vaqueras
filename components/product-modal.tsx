'use client';

import Image from 'next/image';
import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import type { MenuItem, CartItem, CartItemSelection, ProductExtra } from '@/types';
import { calcWebPrice, calcCartItemPrice, formatMXN } from '@/lib/pricing';
import { cn } from '@/lib/utils';

interface ProductModalProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (cartItem: CartItem) => void;
}

export function ProductModal({ item, open, onOpenChange, onConfirm }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [selections, setSelections] = useState<CartItemSelection[]>([]);
  const [comboUpgradeId, setComboUpgradeId] = useState<string | undefined>(undefined);
  const [selectedExtras, setSelectedExtras] = useState<ProductExtra[]>([]);
  const [selectedRemovals, setSelectedRemovals] = useState<string[]>([]);
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [error, setError] = useState('');

  useMemo(() => {
    if (item) {
      setQuantity(1);
      setSelections(
        (item.optionGroups || []).map((group) => ({
          optionGroupId: group.id,
          optionGroupId_label: group.label,
          choices: [],
        }))
      );
      setComboUpgradeId(undefined);
      setSelectedExtras([]);
      setSelectedRemovals([]);
      setSpecialInstructions('');
      setError('');
    }
  }, [item]);

  if (!item) return null;

  const selectedCombo = item.comboUpgrades?.find((c) => c.id === comboUpgradeId);
  const unitPrice = calcCartItemPrice(item.price_base, selectedCombo?.price_base, selectedExtras);
  const totalPrice = unitPrice * quantity;

  const toggleExtra = (extra: ProductExtra) => {
    setSelectedExtras((prev) =>
      prev.some((e) => e.id === extra.id) ? prev.filter((e) => e.id !== extra.id) : [...prev, extra]
    );
  };

  const toggleRemoval = (name: string) => {
    setSelectedRemovals((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
    );
  };

  const toggleChoice = (groupId: string, groupLabel: string, choiceId: string, max: number) => {
    setSelections((prev) =>
      prev.map((sel) => {
        if (sel.optionGroupId !== groupId) return sel;
        if (sel.choices.includes(choiceId)) {
          return { ...sel, choices: sel.choices.filter((c) => c !== choiceId) };
        }
        if (sel.choices.length >= max) {
          return sel;
        }
        return { ...sel, choices: [...sel.choices, choiceId] };
      })
    );
    setError('');
  };

  const handleConfirm = () => {
    for (const group of item.optionGroups || []) {
      const sel = selections.find((s) => s.optionGroupId === group.id);
      const count = sel?.choices.length || 0;
      if (count < group.min) {
        setError(`Debes elegir al menos ${group.min} opción(es) en "${group.label}".`);
        return;
      }
    }

    const cartItem: CartItem = {
      uid: `${item.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      menuItemId: item.id,
      name: item.name,
      image: item.image,
      price_base: item.price_base,
      quantity,
      selections,
      comboUpgrade: selectedCombo,
      extras: selectedExtras.length > 0 ? selectedExtras : undefined,
      removals: selectedRemovals.length > 0 ? selectedRemovals : undefined,
      specialInstructions: specialInstructions.trim() || undefined,
    };

    onConfirm(cartItem);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto border-border/60 bg-card p-0 sm:max-w-md">
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-lg">
          <Image
            src={item.image}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        </div>

        <DialogHeader className="px-5 pt-3">
          <DialogTitle className="text-xl font-bold text-white">{item.name}</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {item.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-5 pb-5">
          {item.optionGroups?.map((group) => {
            const sel = selections.find((s) => s.optionGroupId === group.id);
            const selectedCount = sel?.choices.length || 0;
            return (
              <div key={group.id}>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-sm font-semibold text-white">{group.label}</Label>
                  <span className="text-xs text-muted-foreground">
                    {selectedCount}/{group.max} elegidos
                    {group.min > 0 && <span className="ml-1 text-brand-400">(mín. {group.min})</span>}
                  </span>
                </div>
                <div className="grid gap-2">
                  {group.choices.map((choice) => {
                    const checked = sel?.choices.includes(choice.id) || false;
                    return (
                      <label
                        key={choice.id}
                        className={cn(
                          'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                          checked
                            ? 'border-brand-500 bg-brand-500/10 text-white'
                            : 'border-border text-muted-foreground hover:border-brand-500/40'
                        )}
                        onClick={() => toggleChoice(group.id, group.label, choice.id, group.max)}
                      >
                        <Checkbox checked={checked} readOnly className="pointer-events-none" />
                        <span className="flex-1">{choice.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {item.extras && item.extras.length > 0 && (
            <div>
              <Label className="mb-2 block text-sm font-semibold text-white">Extras</Label>
              <div className="grid gap-2">
                {item.extras.map((extra) => {
                  const checked = selectedExtras.some((e) => e.id === extra.id);
                  return (
                    <label
                      key={extra.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                        checked
                          ? 'border-brand-500 bg-brand-500/10 text-white'
                          : 'border-border text-muted-foreground hover:border-brand-500/40'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleExtra(extra)}
                      />
                      <span className="flex-1">{extra.name}</span>
                      <span className="font-semibold text-brand-400">
                        +{formatMXN(calcWebPrice(extra.price_base))}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {item.removals && item.removals.length > 0 && (
            <div>
              <Label className="mb-2 block text-sm font-semibold text-white">Quitar ingredientes</Label>
              <p className="mb-2 text-xs text-muted-foreground">Marca lo que no quieres en tu orden.</p>
              <div className="grid gap-2">
                {item.removals.map((removal) => {
                  const checked = selectedRemovals.includes(removal.name);
                  return (
                    <label
                      key={removal.id}
                      className={cn(
                        'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                        checked
                          ? 'border-brand-500 bg-brand-500/10 text-white'
                          : 'border-border text-muted-foreground hover:border-brand-500/40'
                      )}
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleRemoval(removal.name)}
                      />
                      <span className="flex-1">Sin {removal.name.toLowerCase()}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {item.comboUpgrades && item.comboUpgrades.length > 0 && (
            <div>
              <Label className="mb-2 block text-sm font-semibold text-white">Añadir combo</Label>
              <RadioGroup
                value={comboUpgradeId || 'none'}
                onValueChange={(v) => setComboUpgradeId(v === 'none' ? undefined : v)}
              >
                <label
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                    !comboUpgradeId
                      ? 'border-brand-500 bg-brand-500/10 text-white'
                      : 'border-border text-muted-foreground hover:border-brand-500/40'
                  )}
                >
                  <RadioGroupItem value="none" />
                  <span className="flex-1">Sin combo</span>
                </label>
                {item.comboUpgrades.map((combo) => (
                  <label
                    key={combo.id}
                    className={cn(
                      'flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors',
                      comboUpgradeId === combo.id
                        ? 'border-brand-500 bg-brand-500/10 text-white'
                        : 'border-border text-muted-foreground hover:border-brand-500/40'
                    )}
                  >
                    <RadioGroupItem value={combo.id} />
                    <span className="flex-1">{combo.name}</span>
                    <span className="font-semibold text-brand-400">
                      +{formatMXN(calcWebPrice(combo.price_base))}
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>
          )}

          <div>
            <Label className="mb-2 block text-sm font-semibold text-white">
              Instrucciones especiales
            </Label>
            <Textarea
              placeholder="Ej: sin cebolla, extra queso, salsa aparte..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="resize-none"
              rows={2}
            />
          </div>

          {error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-400">{error}</p>
          )}

          <div className="flex items-center justify-between gap-3 rounded-xl bg-secondary/50 p-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-border bg-card"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center text-lg font-bold text-white">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 border-border bg-card"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Button
              onClick={handleConfirm}
              className="flex-1 bg-brand-500 text-white hover:bg-brand-600"
              size="lg"
            >
              <ShoppingBag className="mr-2 h-4 w-4" />
              Agregar · {formatMXN(totalPrice)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
