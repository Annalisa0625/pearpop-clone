"use client";

import { useEffect } from "react";

const PRICE_LISTBOX_SELECTOR =
  '[role="listbox"][aria-label="メニュー金額"], [role="listbox"][aria-label="Menu price"]';

function getSelectedSummary(listbox: HTMLElement) {
  const previous = listbox.previousElementSibling;
  if (!(previous instanceof HTMLElement)) return null;

  const text = previous.textContent?.trim() ?? "";
  if (!text.startsWith("選択中:") && !text.startsWith("Selected:")) return null;

  return previous;
}

function syncPricePickerState() {
  document.querySelectorAll<HTMLElement>(PRICE_LISTBOX_SELECTOR).forEach((listbox) => {
    const selectedOption = listbox.querySelector('[role="option"][aria-selected="true"]');
    const summary = getSelectedSummary(listbox);

    if (!selectedOption || !summary) {
      listbox.style.removeProperty("display");
      listbox.dataset.pricePickerOpen = "false";
      return;
    }

    summary.dataset.pricePickerSummary = "true";
    summary.setAttribute("role", "button");
    summary.setAttribute("tabindex", "0");
    summary.style.cursor = "pointer";

    if (listbox.dataset.pricePickerOpen !== "true") {
      listbox.style.display = "none";
    }
  });
}

export default function CreatorPricePickerCollapseBehavior() {
  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const option = target.closest<HTMLElement>('[role="option"]');
      const optionListbox = option?.closest<HTMLElement>(PRICE_LISTBOX_SELECTOR);
      if (optionListbox) {
        optionListbox.dataset.pricePickerOpen = "false";
        return;
      }

      const summary = target.closest<HTMLElement>('[data-price-picker-summary="true"]');
      if (!summary) return;

      const listbox = summary.nextElementSibling;
      if (!(listbox instanceof HTMLElement) || !listbox.matches(PRICE_LISTBOX_SELECTOR)) return;

      listbox.dataset.pricePickerOpen = "true";
      listbox.style.removeProperty("display");
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Enter" && event.key !== " ") return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const summary = target.closest<HTMLElement>('[data-price-picker-summary="true"]');
      if (!summary) return;

      const listbox = summary.nextElementSibling;
      if (!(listbox instanceof HTMLElement) || !listbox.matches(PRICE_LISTBOX_SELECTOR)) return;

      event.preventDefault();
      listbox.dataset.pricePickerOpen = "true";
      listbox.style.removeProperty("display");
    };

    syncPricePickerState();

    const observer = new MutationObserver(() => {
      syncPricePickerState();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["aria-selected"],
      childList: true,
      subtree: true,
    });

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return null;
}
