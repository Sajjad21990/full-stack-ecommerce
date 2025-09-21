'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export type RuleCondition =
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
export type RuleField =
  | 'title'
  | 'type'
  | 'vendor'
  | 'price'
  | 'tag'
  | 'compare_at_price'
  | 'inventory_quantity'
export type RuleOperator = 'AND' | 'OR'

export interface CollectionRule {
  id: string
  field: RuleField
  condition: RuleCondition
  value: string
}

interface CollectionRulesProps {
  rules: CollectionRule[]
  operator: RuleOperator
  onChange: (rules: CollectionRule[], operator: RuleOperator) => void
}

const fieldLabels: Record<RuleField, string> = {
  title: 'Product Title',
  type: 'Product Type',
  vendor: 'Vendor',
  price: 'Price',
  tag: 'Tag',
  compare_at_price: 'Compare at Price',
  inventory_quantity: 'Inventory',
}

const conditionLabels: Record<RuleCondition, string> = {
  contains: 'contains',
  starts_with: 'starts with',
  ends_with: 'ends with',
  equals: 'equals',
  not_equals: 'does not equal',
  greater_than: 'is greater than',
  less_than: 'is less than',
}

const getAvailableConditions = (field: RuleField): RuleCondition[] => {
  switch (field) {
    case 'price':
    case 'compare_at_price':
    case 'inventory_quantity':
      return ['equals', 'not_equals', 'greater_than', 'less_than']
    default:
      return ['contains', 'starts_with', 'ends_with', 'equals', 'not_equals']
  }
}

export function CollectionRules({
  rules,
  operator,
  onChange,
}: CollectionRulesProps) {
  const addRule = () => {
    const newRule: CollectionRule = {
      id: Date.now().toString(),
      field: 'title',
      condition: 'contains',
      value: '',
    }
    onChange([...rules, newRule], operator)
  }

  const updateRule = (id: string, updates: Partial<CollectionRule>) => {
    const updatedRules = rules.map((rule) =>
      rule.id === id ? { ...rule, ...updates } : rule
    )
    onChange(updatedRules, operator)
  }

  const removeRule = (id: string) => {
    onChange(
      rules.filter((rule) => rule.id !== id),
      operator
    )
  }

  const toggleOperator = () => {
    onChange(rules, operator === 'AND' ? 'OR' : 'AND')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Automated Rules</CardTitle>
        <CardDescription>
          Products will be automatically added to this collection when they
          match these rules
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {rules.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="mb-4">No rules defined yet</p>
            <Button onClick={addRule} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add First Rule
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {rules.map((rule, index) => (
                <div key={rule.id} className="space-y-4">
                  {index > 0 && (
                    <div className="flex items-center gap-2">
                      <div className="flex-1 border-t" />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={toggleOperator}
                        className="h-7 px-3"
                      >
                        {operator}
                      </Button>
                      <div className="flex-1 border-t" />
                    </div>
                  )}

                  <div className="flex items-start gap-2">
                    <div className="grid flex-1 grid-cols-3 gap-2">
                      <Select
                        value={rule.field}
                        onValueChange={(value: RuleField) => {
                          const conditions = getAvailableConditions(value)
                          updateRule(rule.id, {
                            field: value,
                            condition: conditions[0],
                            value: '',
                          })
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(fieldLabels).map(([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={rule.condition}
                        onValueChange={(value: RuleCondition) =>
                          updateRule(rule.id, { condition: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {getAvailableConditions(rule.field).map(
                            (condition) => (
                              <SelectItem key={condition} value={condition}>
                                {conditionLabels[condition]}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>

                      <Input
                        placeholder={
                          rule.field === 'price' ||
                          rule.field === 'compare_at_price'
                            ? '0.00'
                            : rule.field === 'inventory_quantity'
                              ? '0'
                              : 'Enter value...'
                        }
                        type={
                          [
                            'price',
                            'compare_at_price',
                            'inventory_quantity',
                          ].includes(rule.field)
                            ? 'number'
                            : 'text'
                        }
                        value={rule.value}
                        onChange={(e) =>
                          updateRule(rule.id, { value: e.target.value })
                        }
                      />
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeRule(rule.id)}
                      className="h-10 w-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              onClick={addRule}
              variant="outline"
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Another Rule
            </Button>

            {/* Rules Summary */}
            <div className="rounded-lg bg-muted p-4">
              <p className="mb-2 text-sm font-medium">Rule Summary:</p>
              <p className="text-sm text-muted-foreground">
                Products will be included if they match{' '}
                <Badge variant="secondary" className="mx-1">
                  {operator === 'AND' ? 'ALL' : 'ANY'}
                </Badge>
                of the following conditions:
              </p>
              <ul className="mt-2 space-y-1">
                {rules.map((rule) => (
                  <li key={rule.id} className="text-sm text-muted-foreground">
                    • {fieldLabels[rule.field]}{' '}
                    {conditionLabels[rule.condition]}{' '}
                    <span className="font-medium">
                      {rule.value || '(empty)'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
