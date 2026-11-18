"use client";

import {
  ArrowDownUpIcon,
  ListFilterIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  recipientFieldLabels,
  stageFilterOperatorLabels,
  studentMailStageLabels,
  studentMailStages,
  textFilterOperatorLabels,
  textOperatorNeedsValue,
  type FilterConjunction,
  type RecipientField,
  type RecipientFilterRule,
  type RecipientSortRule,
  type StageFilterOperator,
  type StudentMailStage,
  type TextFilterOperator,
} from "../../domain/student-mail-recipient";

interface Option<Value extends string> {
  readonly value: Value;
  readonly label: string;
}

const toOptions = <Value extends string>(
  labels: Readonly<Record<Value, string>>,
): Option<Value>[] =>
  (Object.keys(labels) as Value[]).map((value) => ({
    value,
    label: labels[value],
  }));

const fieldOptions = toOptions(recipientFieldLabels);
const textOperatorOptions = toOptions(textFilterOperatorLabels);
const stageOperatorOptions = toOptions(stageFilterOperatorLabels);
const stageOptions = studentMailStages.map((value) => ({
  value,
  label: studentMailStageLabels[value],
}));
const conjunctionOptions: Option<FilterConjunction>[] = [
  { value: "and", label: "Và" },
  { value: "or", label: "Hoặc" },
];
const directionOptions: Option<"asc" | "desc">[] = [
  { value: "asc", label: "Tăng dần" },
  { value: "desc", label: "Giảm dần" },
];

function RuleSelect<Value extends string>({
  label,
  options,
  value,
  onChange,
  className,
}: {
  readonly label: string;
  readonly options: readonly Option<Value>[];
  readonly value: Value;
  readonly onChange: (value: Value) => void;
  readonly className?: string;
}) {
  return (
    <Select
      items={options}
      value={value}
      onValueChange={(next) => {
        if (next !== null) onChange(next as Value);
      }}
    >
      <SelectTrigger aria-label={label} className={className ?? "w-full"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

let ruleSequence = 0;
const nextRuleId = () => {
  ruleSequence += 1;
  return `rule-${ruleSequence}`;
};

function defaultRuleFor(
  field: RecipientField,
  id: string,
): RecipientFilterRule {
  return field === "stage"
    ? { id, field, operator: "is", value: "NOT_SENT" }
    : { id, field, operator: "contains", value: "" };
}

function FilterRuleRow({
  index,
  rule,
  conjunction,
  onConjunctionChange,
  onChange,
  onRemove,
}: {
  readonly index: number;
  readonly rule: RecipientFilterRule;
  readonly conjunction: FilterConjunction;
  readonly onConjunctionChange: (value: FilterConjunction) => void;
  readonly onChange: (rule: RecipientFilterRule) => void;
  readonly onRemove: () => void;
}) {
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[4.5rem_9.5rem_8.5rem_minmax(0,1fr)_auto]">
      <div className="text-xs font-medium text-muted-foreground">
        {index === 0 ? (
          "Khi"
        ) : index === 1 ? (
          <RuleSelect
            label="Cách kết hợp điều kiện"
            options={conjunctionOptions}
            value={conjunction}
            onChange={onConjunctionChange}
          />
        ) : (
          <span className="pl-2.5">
            {conjunction === "and" ? "Và" : "Hoặc"}
          </span>
        )}
      </div>
      <RuleSelect
        label="Trường lọc"
        options={fieldOptions}
        value={rule.field}
        onChange={(field) => onChange(defaultRuleFor(field, rule.id))}
      />
      <Button
        className="sm:order-last"
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Xóa điều kiện"
        onClick={onRemove}
      >
        <XIcon />
      </Button>
      <div className="col-span-3 grid grid-cols-2 gap-2 sm:col-span-2 sm:grid-cols-[8.5rem_minmax(0,1fr)]">
        {rule.field === "stage" ? (
          <>
            <RuleSelect
              label="Toán tử"
              options={stageOperatorOptions}
              value={rule.operator}
              onChange={(operator: StageFilterOperator) =>
                onChange({ ...rule, operator })
              }
            />
            <RuleSelect
              label="Giá trị trạng thái"
              options={stageOptions}
              value={rule.value}
              onChange={(value: StudentMailStage) =>
                onChange({ ...rule, value })
              }
            />
          </>
        ) : (
          <>
            <RuleSelect
              label="Toán tử"
              options={textOperatorOptions}
              value={rule.operator}
              onChange={(operator: TextFilterOperator) =>
                onChange({ ...rule, operator })
              }
            />
            {textOperatorNeedsValue(rule.operator) ? (
              <Input
                aria-label="Giá trị lọc"
                className="h-8"
                placeholder="Nhập giá trị…"
                value={rule.value}
                onChange={(event) =>
                  onChange({ ...rule, value: event.target.value })
                }
              />
            ) : (
              <span />
            )}
          </>
        )}
      </div>
    </div>
  );
}

export function RecipientViewToolbar({
  search,
  onSearchChange,
  filters,
  onFiltersChange,
  conjunction,
  onConjunctionChange,
  sorts,
  onSortsChange,
}: {
  readonly search: string;
  readonly onSearchChange: (value: string) => void;
  readonly filters: readonly RecipientFilterRule[];
  readonly onFiltersChange: (rules: readonly RecipientFilterRule[]) => void;
  readonly conjunction: FilterConjunction;
  readonly onConjunctionChange: (value: FilterConjunction) => void;
  readonly sorts: readonly RecipientSortRule[];
  readonly onSortsChange: (rules: readonly RecipientSortRule[]) => void;
}) {
  const unusedSortField = fieldOptions.find(
    (option) => !sorts.some((rule) => rule.field === option.value),
  );
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Tìm kiếm sinh viên"
            className="pl-9"
            placeholder="Tìm tên, mã lớp, email, SĐT…"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant={filters.length > 0 ? "secondary" : "outline"}
                  size="sm"
                />
              }
            >
              <ListFilterIcon data-icon="inline-start" aria-hidden="true" />
              Lọc
              {filters.length > 0 && (
                <Badge className="ml-0.5 h-4 px-1.5">{filters.length}</Badge>
              )}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[min(44rem,calc(100vw-2rem))] gap-3 p-3"
            >
              <PopoverHeader>
                <PopoverTitle>Bộ lọc</PopoverTitle>
                <PopoverDescription>
                  Thêm điều kiện và chọn cách kết hợp “Và” / “Hoặc”.
                </PopoverDescription>
              </PopoverHeader>
              {filters.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                  Chưa có điều kiện lọc.
                </p>
              ) : (
                <div className="flex flex-col gap-3 sm:gap-2">
                  {filters.map((rule, index) => (
                    <FilterRuleRow
                      key={rule.id}
                      index={index}
                      rule={rule}
                      conjunction={conjunction}
                      onConjunctionChange={onConjunctionChange}
                      onChange={(next) =>
                        onFiltersChange(
                          filters.map((item) =>
                            item.id === rule.id ? next : item,
                          ),
                        )
                      }
                      onRemove={() =>
                        onFiltersChange(
                          filters.filter((item) => item.id !== rule.id),
                        )
                      }
                    />
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    onFiltersChange([
                      ...filters,
                      defaultRuleFor("fullName", nextRuleId()),
                    ])
                  }
                >
                  <PlusIcon data-icon="inline-start" aria-hidden="true" />
                  Thêm điều kiện
                </Button>
                {filters.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onFiltersChange([])}
                  >
                    <Trash2Icon data-icon="inline-start" aria-hidden="true" />
                    Xóa bộ lọc
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger
              render={
                <Button
                  type="button"
                  variant={sorts.length > 0 ? "secondary" : "outline"}
                  size="sm"
                />
              }
            >
              <ArrowDownUpIcon data-icon="inline-start" aria-hidden="true" />
              Sắp xếp
              {sorts.length > 0 && (
                <Badge className="ml-0.5 h-4 px-1.5">{sorts.length}</Badge>
              )}
            </PopoverTrigger>
            <PopoverContent
              align="start"
              className="w-[min(30rem,calc(100vw-2rem))] gap-3 p-3"
            >
              <PopoverHeader>
                <PopoverTitle>Sắp xếp</PopoverTitle>
                <PopoverDescription>
                  Quy tắc phía trên được ưu tiên trước.
                </PopoverDescription>
              </PopoverHeader>
              {sorts.length === 0 ? (
                <p className="rounded-lg border border-dashed px-3 py-4 text-center text-sm text-muted-foreground">
                  Đang giữ thứ tự như trong file.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {sorts.map((rule, index) => (
                    <div
                      key={rule.id}
                      className="grid grid-cols-[1.5rem_minmax(0,1fr)_8rem_auto] items-center gap-2"
                    >
                      <span className="text-center text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <RuleSelect
                        label="Trường sắp xếp"
                        options={fieldOptions.filter(
                          (option) =>
                            option.value === rule.field ||
                            !sorts.some((item) => item.field === option.value),
                        )}
                        value={rule.field}
                        onChange={(field) =>
                          onSortsChange(
                            sorts.map((item) =>
                              item.id === rule.id ? { ...item, field } : item,
                            ),
                          )
                        }
                      />
                      <RuleSelect
                        label="Chiều sắp xếp"
                        options={directionOptions}
                        value={rule.direction}
                        onChange={(direction) =>
                          onSortsChange(
                            sorts.map((item) =>
                              item.id === rule.id
                                ? { ...item, direction }
                                : item,
                            ),
                          )
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Xóa quy tắc sắp xếp"
                        onClick={() =>
                          onSortsChange(
                            sorts.filter((item) => item.id !== rule.id),
                          )
                        }
                      >
                        <XIcon />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={unusedSortField === undefined}
                  onClick={() => {
                    if (unusedSortField !== undefined)
                      onSortsChange([
                        ...sorts,
                        {
                          id: nextRuleId(),
                          field: unusedSortField.value,
                          direction: "asc",
                        },
                      ]);
                  }}
                >
                  <PlusIcon data-icon="inline-start" aria-hidden="true" />
                  Thêm quy tắc
                </Button>
                {sorts.length > 0 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => onSortsChange([])}
                  >
                    <Trash2Icon data-icon="inline-start" aria-hidden="true" />
                    Xóa sắp xếp
                  </Button>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {(filters.length > 0 || sorts.length > 0) && (
        <div
          className="flex flex-wrap items-center gap-1.5"
          aria-label="Điều kiện đang áp dụng"
        >
          {sorts.map((rule) => (
            <Badge key={rule.id} variant="outline" className="h-6 gap-1 pr-1">
              <ArrowDownUpIcon aria-hidden="true" />
              {recipientFieldLabels[rule.field]} ·{" "}
              {rule.direction === "asc" ? "tăng" : "giảm"}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label={`Bỏ sắp xếp ${recipientFieldLabels[rule.field]}`}
                onClick={() =>
                  onSortsChange(sorts.filter((item) => item.id !== rule.id))
                }
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
          {filters.map((rule) => (
            <Badge key={rule.id} variant="outline" className="h-6 gap-1 pr-1">
              <ListFilterIcon aria-hidden="true" />
              {describeFilter(rule)}
              <button
                type="button"
                className="rounded-full p-0.5 hover:bg-muted"
                aria-label="Bỏ điều kiện lọc"
                onClick={() =>
                  onFiltersChange(filters.filter((item) => item.id !== rule.id))
                }
              >
                <XIcon className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function describeFilter(rule: RecipientFilterRule): string {
  const field = recipientFieldLabels[rule.field];
  if (rule.field === "stage")
    return `${field} ${stageFilterOperatorLabels[rule.operator]} ${studentMailStageLabels[rule.value]}`;
  if (!textOperatorNeedsValue(rule.operator))
    return `${field} ${textFilterOperatorLabels[rule.operator]}`;
  return `${field} ${textFilterOperatorLabels[rule.operator]} “${rule.value.trim() === "" ? "…" : rule.value.trim()}”`;
}
