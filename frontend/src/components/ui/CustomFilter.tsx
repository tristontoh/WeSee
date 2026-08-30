/**
 * Copyright (c) 2026 Triston Toh. All rights reserved.
 * See LICENSE at the repository root — visibility is not a licence to use.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Filter as FilterIcon, Plus, X, GripVertical } from 'lucide-react';
import Select from './Select';

export type FilterFieldType = 'text' | 'number' | 'select' | 'boolean' | 'date';

export interface FilterFieldOption {
  value: string;
  label: string;
}

export interface FilterFieldDef {
  key: string;
  label: string;
  type: FilterFieldType;
  /** Required for 'select' and 'boolean' fields — populates the value dropdown. */
  options?: FilterFieldOption[];
}

export type FilterOperator =
  | 'contains' | 'not_contains'
  | 'is' | 'is_not'
  | 'higher_than' | 'lower_than'
  | 'before' | 'after'
  | 'is_empty' | 'is_not_empty';

export interface FilterCondition {
  id: string;
  /** Ignored for the first condition in the list. */
  connector: 'and' | 'or';
  fieldKey: string;
  operator: FilterOperator;
  value: string;
}

const OPERATORS_BY_TYPE: Record<FilterFieldType, { value: FilterOperator; label: string }[]> = {
  text: [
    { value: 'contains', label: 'Contains' },
    { value: 'not_contains', label: 'Does not contain' },
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  number: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'higher_than', label: 'Is higher than' },
    { value: 'lower_than', label: 'Is lower than' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  select: [
    { value: 'is', label: 'Is' },
    { value: 'is_not', label: 'Is not' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
  boolean: [
    { value: 'is', label: 'Is' },
  ],
  date: [
    { value: 'is', label: 'Is' },
    { value: 'before', label: 'Is before' },
    { value: 'after', label: 'Is after' },
    { value: 'is_empty', label: 'Is empty' },
    { value: 'is_not_empty', label: 'Is not empty' },
  ],
};

const VALUELESS_OPERATORS = new Set<FilterOperator>(['is_empty', 'is_not_empty']);

function newConditionId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `f${Date.now()}${Math.random().toString(36).slice(2)}`;
}

interface CustomFilterProps {
  fields: FilterFieldDef[];
  value: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
}

export default function CustomFilter({ fields, value, onChange }: CustomFilterProps) {
  const [open, setOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const fieldByKey = (key: string) => fields.find((f) => f.key === key);

  const addFilter = () => {
    const firstField = fields[0];
    if (!firstField) return;
    const condition: FilterCondition = {
      id: newConditionId(),
      connector: 'and',
      fieldKey: firstField.key,
      operator: OPERATORS_BY_TYPE[firstField.type][0].value,
      value: '',
    };
    onChange([...value, condition]);
    setOpen(true);
  };

  const updateCondition = (id: string, patch: Partial<FilterCondition>) => {
    onChange(value.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  const removeCondition = (id: string) => {
    onChange(value.filter((c) => c.id !== id));
  };

  const handleFieldChange = (condition: FilterCondition, fieldKey: string) => {
    const field = fieldByKey(fieldKey);
    const operators = field ? OPERATORS_BY_TYPE[field.type] : OPERATORS_BY_TYPE.text;
    updateCondition(condition.id, { fieldKey, operator: operators[0].value, value: '' });
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const reordered = [...value];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    onChange(reordered);
    setDragIndex(null);
  };

  return (
    <div className="relative inline-block" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-lg border cursor-pointer transition-colors ${
          value.length > 0
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <FilterIcon className="w-4 h-4" />
        <span>Filter{value.length > 0 ? ` (${value.length})` : ''}</span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[640px] max-w-[90vw] bg-white border border-gray-100 rounded-2xl shadow-lg p-4 z-40 animate-fade-in">
          {value.length === 0 ? (
            <p className="text-sm text-gray-400 px-1 py-2">No filters applied.</p>
          ) : (
            <div className="space-y-2 mb-3">
              {value.map((condition, index) => {
                const field = fieldByKey(condition.fieldKey);
                const type = field?.type ?? 'text';
                const operators = OPERATORS_BY_TYPE[type];
                const needsValue = !VALUELESS_OPERATORS.has(condition.operator);

                return (
                  <div
                    key={condition.id}
                    draggable
                    onDragStart={() => setDragIndex(index)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => handleDrop(index)}
                    className={`flex items-center gap-2 ${dragIndex === index ? 'opacity-40' : ''}`}
                  >
                    <div className="w-16 shrink-0">
                      {index === 0 ? (
                        <span className="block px-2 py-2 text-xs font-semibold text-gray-400">Where</span>
                      ) : (
                        <Select
                          size="sm"
                          className="w-full"
                          aria-label="Join with"
                          value={condition.connector}
                          onChange={(v) => updateCondition(condition.id, { connector: v as 'and' | 'or' })}
                          options={[
                            { value: 'and', label: 'and' },
                            { value: 'or', label: 'or' },
                          ]}
                        />
                      )}
                    </div>

                    <Select
                      className="flex-1 min-w-0"
                      aria-label="Field"
                      value={condition.fieldKey}
                      onChange={(v) => handleFieldChange(condition, v)}
                      options={fields.map((f) => ({ value: f.key, label: f.label }))}
                    />

                    <Select
                      className="flex-1 min-w-0"
                      aria-label="Operator"
                      value={condition.operator}
                      onChange={(v) => updateCondition(condition.id, { operator: v as FilterOperator, value: '' })}
                      options={operators.map((op) => ({ value: op.value, label: op.label }))}
                    />

                    {needsValue ? (
                      field?.type === 'select' || field?.type === 'boolean' ? (
                        <Select
                          className="flex-1 min-w-0"
                          aria-label="Value"
                          placeholder="Select…"
                          value={condition.value}
                          onChange={(v) => updateCondition(condition.id, { value: v })}
                          options={(field.options ?? []).map((opt) => ({ value: opt.value, label: opt.label }))}
                        />
                      ) : (
                        <input
                          type={field?.type === 'number' ? 'number' : field?.type === 'date' ? 'date' : 'text'}
                          value={condition.value}
                          onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                          placeholder="Value"
                          className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 outline-none focus:border-emerald-500 transition-colors"
                        />
                      )
                    ) : (
                      <div className="flex-1 min-w-0" />
                    )}

                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0 cursor-grab active:cursor-grabbing" />

                    <button
                      type="button"
                      onClick={() => removeCondition(condition.id)}
                      className="p-1.5 text-gray-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors shrink-0"
                      title="Remove filter"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <button
            type="button"
            onClick={addFilter}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add filter
          </button>
        </div>
      )}
    </div>
  );
}

/** Sequential left-to-right evaluation (no parenthesized groups) — each condition's connector joins it to the running result of everything before it. */
export function applyFilters<T extends Record<string, unknown>>(
  items: T[],
  conditions: FilterCondition[],
  fields: FilterFieldDef[]
): T[] {
  if (conditions.length === 0) return items;

  const fieldByKey = new Map(fields.map((f) => [f.key, f]));

  const evaluate = (item: T, condition: FilterCondition): boolean => {
    const field = fieldByKey.get(condition.fieldKey);
    const raw = item[condition.fieldKey];
    const isEmpty = raw === null || raw === undefined || raw === '';

    if (condition.operator === 'is_empty') return isEmpty;
    if (condition.operator === 'is_not_empty') return !isEmpty;
    if (isEmpty) return false;

    if (field?.type === 'number') {
      const itemNum = Number(raw);
      const targetNum = Number(condition.value);
      if (Number.isNaN(itemNum) || Number.isNaN(targetNum)) return false;
      switch (condition.operator) {
        case 'is': return itemNum === targetNum;
        case 'is_not': return itemNum !== targetNum;
        case 'higher_than': return itemNum > targetNum;
        case 'lower_than': return itemNum < targetNum;
        default: return true;
      }
    }

    if (field?.type === 'date') {
      const itemTime = new Date(String(raw)).getTime();
      const targetTime = new Date(condition.value).getTime();
      if (Number.isNaN(itemTime) || Number.isNaN(targetTime)) return false;
      switch (condition.operator) {
        case 'is': return itemTime === targetTime;
        case 'before': return itemTime < targetTime;
        case 'after': return itemTime > targetTime;
        default: return true;
      }
    }

    const itemStr = String(raw).toLowerCase();
    const targetStr = condition.value.toLowerCase();
    switch (condition.operator) {
      case 'contains': return itemStr.includes(targetStr);
      case 'not_contains': return !itemStr.includes(targetStr);
      case 'is': return itemStr === targetStr;
      case 'is_not': return itemStr !== targetStr;
      default: return true;
    }
  };

  return items.filter((item) => {
    let result = evaluate(item, conditions[0]);
    for (let i = 1; i < conditions.length; i++) {
      const c = conditions[i];
      const r = evaluate(item, c);
      result = c.connector === 'or' ? result || r : result && r;
    }
    return result;
  });
}
