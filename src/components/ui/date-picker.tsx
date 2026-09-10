"use client"

import { useState } from "react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

const DATE_PICKER_START_MONTH = new Date(1900, 0, 1)
const DATE_PICKER_END_MONTH = new Date(2100, 11, 1)

function parseDateOnly(value: string | null | undefined): Date | undefined {
  if (typeof value !== "string") return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value)
  if (match === null) return undefined

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
    ? date
    : undefined
}

function formatDateOnly(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function DatePicker({
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  disabled = false,
  id,
  name,
  onBlur,
  onValueChange,
  placeholder = "Chọn ngày",
  required = false,
  value,
}: {
  readonly "aria-describedby"?: string
  readonly "aria-invalid"?: boolean
  readonly disabled?: boolean
  readonly id: string
  readonly name?: string
  readonly onBlur?: () => void
  readonly onValueChange: (value: string | null) => void
  readonly placeholder?: string
  readonly required?: boolean
  readonly value: string | null | undefined
}) {
  const [open, setOpen] = useState(false)
  const selectedDate = parseDateOnly(value)

  return (
    <>
      {name === undefined ? null : (
        <input type="hidden" name={name} value={value ?? ""} />
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <Button
              id={id}
              type="button"
              variant="outline"
              disabled={disabled}
              data-empty={selectedDate === undefined}
              className="w-full justify-between rounded-lg text-left font-normal data-[empty=true]:text-muted-foreground"
              aria-describedby={ariaDescribedBy}
              aria-invalid={ariaInvalid}
              aria-required={required}
              onBlur={onBlur}
            />
          }
        >
          {selectedDate === undefined
            ? placeholder
            : format(selectedDate, "dd/MM/yyyy", { locale: vi })}
          <ChevronDownIcon data-icon="inline-end" />
        </PopoverTrigger>
        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
          <Calendar
            mode="single"
            selected={selectedDate}
            defaultMonth={selectedDate}
            captionLayout="dropdown"
            navLayout="after"
            startMonth={DATE_PICKER_START_MONTH}
            endMonth={DATE_PICKER_END_MONTH}
            locale={vi}
            required={required}
            onSelect={(date: Date | undefined) => {
              onValueChange(date === undefined ? null : formatDateOnly(date))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </>
  )
}

export { DatePicker }
