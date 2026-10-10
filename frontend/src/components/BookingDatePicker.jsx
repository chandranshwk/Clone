function formatCalendarDate(date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function BookingDatePicker({ value, min, timezone, onChange }) {
  const [open, setOpen] = useState(false);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = parseCalendarDate(value || min);
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
  });
  const [popupPosition, setPopupPosition] = useState(null);
  const calendarRef = useRef(null);
  const triggerRef = useRef(null);
  const minimumDate = parseCalendarDate(min);
  const selectedDate = parseCalendarDate(value);
  const monthStart = new Date(
    Date.UTC(visibleMonth.getUTCFullYear(), visibleMonth.getUTCMonth(), 1),
  );
  const weekdayOffset = (monthStart.getUTCDay() + 6) % 7;
  const gridStart = new Date(
    Date.UTC(
      monthStart.getUTCFullYear(),
      monthStart.getUTCMonth(),
      1 - weekdayOffset,
    ),
  );
  const calendarDays = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(
      Date.UTC(
        gridStart.getUTCFullYear(),
        gridStart.getUTCMonth(),
        gridStart.getUTCDate() + index,
      ),
    );
    return {
      date,
      value: date.toISOString().slice(0, 10),
      adjacent: date.getUTCMonth() !== monthStart.getUTCMonth(),
    };
  });
  const monthLabel = new Intl.DateTimeFormat(undefined, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(monthStart);
  const minimumMonth = new Date(
    Date.UTC(minimumDate.getUTCFullYear(), minimumDate.getUTCMonth(), 1),
  );
  const previousMonth = new Date(
    Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() - 1, 1),
  );
  const previousDisabled = previousMonth < minimumMonth;

  function calculatePopupPosition() {
    const trigger = triggerRef.current;
    if (!trigger) return null;

    const bounds = trigger.getBoundingClientRect();
    const width = Math.min(352, window.innerWidth - 32);
    const left = Math.max(
      16,
      Math.min(bounds.left, window.innerWidth - width - 16),
    );
    const top = Math.max(
      12,
      Math.min(bounds.bottom + 9, window.innerHeight - 176),
    );

    return { top, left, width };
  }

  useEffect(() => {
    if (!open) return undefined;

    function repositionPopup() {
      const position = calculatePopupPosition();
      if (position) setPopupPosition(position);
    }

    function closeOnOutsidePointer(event) {
      if (
        !calendarRef.current?.contains(event.target) &&
        !event.target.closest(".theme-toggle")
      ) {
        setOpen(false);
        setPopupPosition(null);
      }
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        setPopupPosition(null);
        triggerRef.current?.focus();
      }
    }

    repositionPopup();
    window.addEventListener("resize", repositionPopup);
    document.addEventListener("scroll", repositionPopup, true);
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("resize", repositionPopup);
      document.removeEventListener("scroll", repositionPopup, true);
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  function changeMonth(amount) {
    setVisibleMonth(
      new Date(
        Date.UTC(
          monthStart.getUTCFullYear(),
          monthStart.getUTCMonth() + amount,
          1,
        ),
      ),
    );
  }

  function selectDate(dateValue) {
    onChange(dateValue);
    const date = parseCalendarDate(dateValue);
    setVisibleMonth(
      new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)),
    );
    setOpen(false);
    setPopupPosition(null);
    triggerRef.current?.focus();
  }

  return (
    <div className="field date-field">
      <span id="booking-date-label">Choose a date in {timezone}</span>
      <div className="booking-calendar" ref={calendarRef}>
        <button
          ref={triggerRef}
          type="button"
          className="calendar-trigger"
          aria-labelledby="booking-date-label"
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? "booking-calendar-panel" : undefined}
          onClick={() => {
            if (!open) {
              const date = parseCalendarDate(value || min);
              setVisibleMonth(
                new Date(
                  Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1),
                ),
              );
              setPopupPosition(calculatePopupPosition());
            } else {
              setPopupPosition(null);
            }
            setOpen((wasOpen) => !wasOpen);
          }}
        >
          <span className="calendar-trigger-date">
            <CalendarDays size={17} aria-hidden="true" />
            {formatCalendarDate(selectedDate)}
          </span>
          <ChevronDown
            size={16}
            className={
              open
                ? "calendar-trigger-chevron is-open"
                : "calendar-trigger-chevron"
            }
            aria-hidden="true"
          />
        </button>

        {open ? (
          <div
            className="calendar-popup"
            id="booking-calendar-panel"
            role="dialog"
            aria-label={`Choose a date, ${monthLabel}`}
            style={
              popupPosition
                ? {
                    top: `${popupPosition.top}px`,
                    left: `${popupPosition.left}px`,
                    width: `${popupPosition.width}px`,
                    "--calendar-top": `${popupPosition.top}px`,
                  }
                : undefined
            }
          >
            <div className="calendar-header">
              <div>
                <span className="calendar-header-kicker">SELECT A DAY</span>
                <h3 id="booking-calendar-month">{monthLabel}</h3>
              </div>
              <div className="calendar-navigation">
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Previous month"
                  disabled={previousDisabled}
                  onClick={() => changeMonth(-1)}
                >
                  <ChevronLeft size={17} aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className="calendar-nav-button"
                  aria-label="Next month"
                  onClick={() => changeMonth(1)}
                >
                  <ChevronRight size={17} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div
              className="calendar-grid"
              role="grid"
              aria-labelledby="booking-calendar-month"
            >
              <div className="calendar-week calendar-weekdays" role="row">
                {["M", "T", "W", "T", "F", "S", "S"].map((weekday, index) => (
                  <span
                    className="calendar-weekday"
                    role="columnheader"
                    aria-label={
                      [
                        "Monday",
                        "Tuesday",
                        "Wednesday",
                        "Thursday",
                        "Friday",
                        "Saturday",
                        "Sunday",
                      ][index]
                    }
                    key={`${weekday}-${index}`}
                  >
                    {weekday}
                  </span>
                ))}
              </div>
              {Array.from({ length: 6 }, (_, weekIndex) => (
                <div className="calendar-week" role="row" key={weekIndex}>
                  {calendarDays
                    .slice(weekIndex * 7, weekIndex * 7 + 7)
                    .map(({ date, value: dateValue, adjacent }) => {
                      const isSelected = dateValue === value;
                      const isToday = dateValue === min;
                      const isDisabled = isCalendarDateDisabled(dateValue, min);
                      return (
                        <span
                          className="calendar-cell"
                          role="gridcell"
                          key={dateValue}
                        >
                          <button
                            type="button"
                            className={[
                              "calendar-day",
                              adjacent ? "is-adjacent" : "",
                              isToday ? "is-today" : "",
                              isSelected ? "is-selected" : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            aria-label={formatCalendarDate(date)}
                            aria-pressed={isSelected}
                            aria-current={isToday ? "date" : undefined}
                            disabled={isDisabled}
                            onClick={() => selectDate(dateValue)}
                          >
                            {date.getUTCDate()}
                          </button>
                        </span>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
