import { useEffect, useRef, useState } from "react";

export function SubjectDropdown({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const optionRefs = useRef([]);
  const items = [
    { value: "", label: "All subjects" },
    ...options.map((option) => ({ value: option, label: option })),
  ];
  const selectedIndex = Math.max(
    0,
    items.findIndex((item) => item.value === value),
  );

  useEffect(() => {
    if (!open) return undefined;

    function closeOnOutsidePointer(event) {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (open) optionRefs.current[activeIndex]?.focus();
  }, [open, activeIndex]);

  function openMenu() {
    setActiveIndex(selectedIndex);
    setOpen(true);
  }

  function closeMenu() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  function chooseItem(index) {
    onChange(items[index].value);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
      event.preventDefault();
      if (!open) openMenu();
    }
  }

  function handleOptionKeyDown(event, index) {
    let nextIndex = index;
    if (event.key === "ArrowDown") nextIndex = (index + 1) % items.length;
    else if (event.key === "ArrowUp") {
      nextIndex = (index - 1 + items.length) % items.length;
    } else if (event.key === "Home") nextIndex = 0;
    else if (event.key === "End") nextIndex = items.length - 1;
    else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      chooseItem(index);
      return;
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeMenu();
      return;
    } else {
      return;
    }

    event.preventDefault();
    setActiveIndex(nextIndex);
    optionRefs.current[nextIndex]?.focus();
  }

  return (
    <div className="subject-dropdown" ref={dropdownRef}>
      <span className="sr-only" id="subject-filter-label">
        Filter by subject
      </span>
      <button
        ref={triggerRef}
        type="button"
        className="subject-dropdown-trigger"
        aria-labelledby="subject-filter-label"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? "subject-filter-options" : undefined}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{items[selectedIndex].label}</span>
        <span className="subject-dropdown-caret" aria-hidden="true" />
      </button>
      {open ? (
        <div
          className="subject-dropdown-menu"
          id="subject-filter-options"
          role="listbox"
          aria-labelledby="subject-filter-label"
        >
          {items.map((item, index) => (
            <button
              ref={(element) => {
                optionRefs.current[index] = element;
              }}
              className="subject-dropdown-option"
              type="button"
              role="option"
              aria-selected={item.value === value}
              tabIndex={activeIndex === index ? 0 : -1}
              key={item.value || "all-subjects"}
              onClick={() => chooseItem(index)}
              onKeyDown={(event) => handleOptionKeyDown(event, index)}
              onMouseEnter={() => setActiveIndex(index)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
