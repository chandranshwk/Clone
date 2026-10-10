export function availabilitySummary(mentor) {
  const dayNames = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const days = [
    ...new Set(mentor.availability.map((window) => window.dayOfWeek)),
  ]
    .sort((left, right) => left - right)
    .map((day) => dayNames[day]);
  const dayLabel =
    days.length === 5 && days.join(",") === "Mon,Tue,Wed,Thu,Fri"
      ? "Weekdays"
      : days.join(", ");
  const window = mentor.availability[0];

  return window
    ? `${dayLabel} · ${window.startTime}–${window.endTime} local`
    : "Check upcoming availability";
}
