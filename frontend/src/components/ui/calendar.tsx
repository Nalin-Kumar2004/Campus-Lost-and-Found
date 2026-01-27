import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface CalendarProps {
  mode?: "single"
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  disabled?: (date: Date) => boolean
  className?: string
  initialFocus?: boolean
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

type View = "days" | "months" | "years"

function Calendar({ selected, onSelect, disabled, className }: CalendarProps) {
  const today = new Date()
  
  const [viewDate, setViewDate] = React.useState(() => {
    if (selected) {
      return { month: selected.getMonth(), year: selected.getFullYear() }
    }
    return { month: today.getMonth(), year: today.getFullYear() }
  })
  
  const [view, setView] = React.useState<View>("days")
  const [yearRangeStart, setYearRangeStart] = React.useState(() => {
    return Math.floor(viewDate.year / 12) * 12
  })

  // Get days in month
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate()
  }

  // Get first day of month (0 = Sunday)
  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay()
  }

  // Check if date is today
  const isToday = (year: number, month: number, day: number) => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  // Check if date is selected
  const isSelected = (year: number, month: number, day: number) => {
    if (!selected) return false
    return (
      selected.getFullYear() === year &&
      selected.getMonth() === month &&
      selected.getDate() === day
    )
  }

  // Check if date is disabled
  const isDateDisabled = (year: number, month: number, day: number) => {
    if (!disabled) return false
    return disabled(new Date(year, month, day))
  }

  // Handle date selection
  const selectDate = (day: number) => {
    const newDate = new Date(viewDate.year, viewDate.month, day)
    if (isDateDisabled(viewDate.year, viewDate.month, day)) return
    onSelect?.(newDate)
  }

  // Handle month selection
  const selectMonth = (month: number) => {
    setViewDate({ ...viewDate, month })
    setView("days")
  }

  // Handle year selection
  const selectYear = (year: number) => {
    setViewDate({ ...viewDate, year })
    setView("months")
  }

  // Navigate months
  const prevMonth = () => {
    if (viewDate.month === 0) {
      setViewDate({ month: 11, year: viewDate.year - 1 })
    } else {
      setViewDate({ ...viewDate, month: viewDate.month - 1 })
    }
  }

  const nextMonth = () => {
    if (viewDate.month === 11) {
      setViewDate({ month: 0, year: viewDate.year + 1 })
    } else {
      setViewDate({ ...viewDate, month: viewDate.month + 1 })
    }
  }

  // Navigate years
  const prevYears = () => setYearRangeStart(yearRangeStart - 12)
  const nextYears = () => setYearRangeStart(yearRangeStart + 12)

  // Build days grid
  const buildDaysGrid = () => {
    const daysInMonth = getDaysInMonth(viewDate.year, viewDate.month)
    const firstDay = getFirstDayOfMonth(viewDate.year, viewDate.month)
    const days: React.ReactNode[] = []

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-10 h-10" />)
    }

    // Day buttons
    for (let day = 1; day <= daysInMonth; day++) {
      const selectedDay = isSelected(viewDate.year, viewDate.month, day)
      const todayDay = isToday(viewDate.year, viewDate.month, day)
      const disabledDay = isDateDisabled(viewDate.year, viewDate.month, day)

      days.push(
        <button
          key={day}
          type="button"
          disabled={disabledDay}
          onClick={() => selectDate(day)}
          className={cn(
            "w-10 h-10 rounded-full text-sm font-medium transition-all duration-200",
            "hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1",
            selectedDay && "bg-indigo-600 text-white hover:bg-indigo-700",
            todayDay && !selectedDay && "border-2 border-indigo-600 text-indigo-600",
            disabledDay && "text-gray-300 cursor-not-allowed hover:bg-transparent"
          )}
        >
          {day}
        </button>
      )
    }

    return days
  }

  // Build months grid
  const buildMonthsGrid = () => {
    return MONTHS.map((month, index) => (
      <button
        key={month}
        type="button"
        onClick={() => selectMonth(index)}
        className={cn(
          "py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200",
          "hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500",
          index === viewDate.month && "bg-indigo-600 text-white hover:bg-indigo-700"
        )}
      >
        {month.slice(0, 3)}
      </button>
    ))
  }

  // Build years grid
  const buildYearsGrid = () => {
    const years: React.ReactNode[] = []
    for (let i = 0; i < 12; i++) {
      const year = yearRangeStart + i
      years.push(
        <button
          key={year}
          type="button"
          onClick={() => selectYear(year)}
          className={cn(
            "py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200",
            "hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-indigo-500",
            year === viewDate.year && "bg-indigo-600 text-white hover:bg-indigo-700"
          )}
        >
          {year}
        </button>
      )
    }
    return years
  }

  return (
    <div className={cn("p-4 bg-white rounded-xl shadow-lg border border-gray-200 w-80", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={view === "years" ? prevYears : prevMonth}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        <button
          type="button"
          onClick={() => {
            if (view === "days") setView("months")
            else if (view === "months") setView("years")
            else setView("days")
          }}
          className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors px-3 py-1 rounded-lg hover:bg-indigo-50"
        >
          {view === "days" && `${MONTHS[viewDate.month]} ${viewDate.year}`}
          {view === "months" && viewDate.year}
          {view === "years" && `${yearRangeStart} - ${yearRangeStart + 11}`}
        </button>

        <button
          type="button"
          onClick={view === "years" ? nextYears : nextMonth}
          className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Days View */}
      {view === "days" && (
        <>
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map((day) => (
              <div
                key={day}
                className="w-10 h-10 flex items-center justify-center text-xs font-semibold text-gray-500 uppercase"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">{buildDaysGrid()}</div>
        </>
      )}

      {/* Months View */}
      {view === "months" && (
        <div className="grid grid-cols-3 gap-2">{buildMonthsGrid()}</div>
      )}

      {/* Years View */}
      {view === "years" && (
        <div className="grid grid-cols-3 gap-2">{buildYearsGrid()}</div>
      )}

      {/* Footer - Quick select today */}
      {view === "days" && (
        <div className="mt-4 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => {
              setViewDate({ month: today.getMonth(), year: today.getFullYear() })
              onSelect?.(today)
            }}
            className="w-full py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          >
            Today
          </button>
        </div>
      )}
    </div>
  )
}

Calendar.displayName = "Calendar"

export { Calendar }
export type { CalendarProps }
