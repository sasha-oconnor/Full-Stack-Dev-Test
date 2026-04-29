"use client";

import {
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  UIEvent,
} from "react";
import { motion, useInView } from "motion/react";

// ─── AnimatedItem ─────────────────────────────────────────────────────────────
// Exported for standalone use (e.g. inside existing divide-y containers where
// the full AnimatedList wrapper would conflict with layout).

interface AnimatedItemProps {
  children: ReactNode;
  index: number;
  delay?: number;
  className?: string;
}

export function AnimatedItem({
  children,
  index,
  delay = 0,
  className = "",
}: AnimatedItemProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: 0.5, once: false });
  return (
    <motion.div
      ref={ref}
      data-index={index}
      initial={{ scale: 0.7, opacity: 0 }}
      animate={inView ? { scale: 1, opacity: 1 } : { scale: 0.7, opacity: 0 }}
      transition={{ duration: 0.12, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ─── AnimatedList ─────────────────────────────────────────────────────────────

interface AnimatedListProps<T> {
  items: T[];
  /**
   * Render function for each item. Receives the item, its index, and whether
   * it is currently hover-highlighted in the list.
   */
  renderItem: (item: T, index: number, selected: boolean) => ReactNode;
  /** Called when an item is clicked or activated via keyboard Enter. */
  onItemSelect?: (item: T, index: number) => void;
  /** Show fade gradients at top and bottom of the scroll container. */
  showGradients?: boolean;
  /** Enable ArrowUp / ArrowDown / Enter keyboard navigation. Does not hijack Tab. */
  enableArrowNavigation?: boolean;
  /** Class applied to the outer wrapper div. */
  className?: string;
  /** Class applied to each AnimatedItem (motion.div) wrapper. */
  itemClassName?: string;
  /** Show a styled scrollbar. Defaults to false (hidden). */
  displayScrollbar?: boolean;
  /** Index of the initially highlighted item. -1 means none. */
  initialSelectedIndex?: number;
  /**
   * Maximum height of the scroll container.
   * Pass "none" or omit to let the list grow with its content (no overflow).
   */
  maxHeight?: string;
}

export function AnimatedList<T>({
  items,
  renderItem,
  onItemSelect,
  showGradients = true,
  enableArrowNavigation = true,
  className = "",
  itemClassName = "",
  displayScrollbar = false,
  initialSelectedIndex = -1,
  maxHeight = "400px",
}: AnimatedListProps<T>) {
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(initialSelectedIndex);
  const [keyboardNav, setKeyboardNav] = useState(false);
  const [topGradientOpacity, setTopGradientOpacity] = useState(0);
  const [bottomGradientOpacity, setBottomGradientOpacity] = useState(1);

  const handleItemMouseEnter = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  const handleItemClick = useCallback(
    (item: T, index: number) => {
      setSelectedIndex(index);
      onItemSelect?.(item, index);
    },
    [onItemSelect]
  );

  const handleScroll = (e: UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } =
      e.target as HTMLDivElement;
    setTopGradientOpacity(Math.min(scrollTop / 50, 1));
    const bottomDistance = scrollHeight - (scrollTop + clientHeight);
    setBottomGradientOpacity(
      scrollHeight <= clientHeight ? 0 : Math.min(bottomDistance / 50, 1)
    );
  };

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!enableArrowNavigation) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.min(prev + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setKeyboardNav(true);
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (
        e.key === "Enter" &&
        selectedIndex >= 0 &&
        selectedIndex < items.length
      ) {
        e.preventDefault();
        onItemSelect?.(items[selectedIndex], selectedIndex);
      }
    },
    [enableArrowNavigation, items, selectedIndex, onItemSelect]
  );

  useEffect(() => {
    if (!keyboardNav || selectedIndex < 0 || !listRef.current) return;
    const container = listRef.current;
    const el = container.querySelector(
      `[data-index="${selectedIndex}"]`
    ) as HTMLElement | null;
    if (el) {
      const margin = 50;
      const itemTop = el.offsetTop;
      const itemBottom = itemTop + el.offsetHeight;
      if (itemTop < container.scrollTop + margin) {
        container.scrollTo({ top: itemTop - margin, behavior: "smooth" });
      } else if (
        itemBottom >
        container.scrollTop + container.clientHeight - margin
      ) {
        container.scrollTo({
          top: itemBottom - container.clientHeight + margin,
          behavior: "smooth",
        });
      }
    }
    setKeyboardNav(false);
  }, [selectedIndex, keyboardNav]);

  const constrained = maxHeight !== "none" && maxHeight !== "";

  return (
    <div className={`relative w-full ${className}`}>
      <div
        ref={listRef}
        tabIndex={enableArrowNavigation ? 0 : undefined}
        onKeyDown={enableArrowNavigation ? handleKeyDown : undefined}
        onScroll={handleScroll}
        className={`outline-none ${constrained ? "overflow-y-auto" : ""} ${
          displayScrollbar
            ? "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-background [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-sm"
            : "scrollbar-hide"
        }`}
        style={
          constrained
            ? {
                maxHeight,
                scrollbarWidth: displayScrollbar ? "thin" : "none",
              }
            : undefined
        }
      >
        {items.map((item, index) => (
          <AnimatedItem
            key={index}
            index={index}
            delay={Math.min(index * 0.006, 0.04)}
            className={itemClassName}
          >
            <div
              onMouseEnter={() => handleItemMouseEnter(index)}
              onClick={() => handleItemClick(item, index)}
            >
              {renderItem(item, index, selectedIndex === index)}
            </div>
          </AnimatedItem>
        ))}
      </div>

      {showGradients && (
        <>
          <div
            className="pointer-events-none absolute left-0 right-0 top-0 h-12 bg-linear-to-b from-background to-transparent transition-opacity duration-300"
            style={{ opacity: topGradientOpacity }}
          />
          <div
            className="pointer-events-none absolute bottom-0 left-0 right-0 h-20 bg-linear-to-t from-background to-transparent transition-opacity duration-300"
            style={{ opacity: bottomGradientOpacity }}
          />
        </>
      )}
    </div>
  );
}
