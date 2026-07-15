"use client";

import { useRef } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from "react";

import {
  GainField as BaseGainField,
  OffsetFlowFigure,
  ThresholdField,
} from "./gain-field-next";

interface GainFieldProps {
  className?: string;
  compact?: boolean;
  caption?: string;
}

const selectedPointSelector = '[aria-label^="Proposed agreement."]';

function isSelectedPoint(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest(selectedPointSelector));
}

export function GainField(props: GainFieldProps) {
  const suppressRetargetedTouchClick = useRef(false);

  function handlePointerDownCapture(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerType === "touch") {
      suppressRetargetedTouchClick.current = !isSelectedPoint(event.target);
    }
  }

  function handleClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    const pointerType = (event.nativeEvent as PointerEvent).pointerType;
    const shouldSuppress =
      pointerType === "touch" &&
      suppressRetargetedTouchClick.current &&
      isSelectedPoint(event.target);

    suppressRetargetedTouchClick.current = false;
    if (shouldSuppress) {
      event.stopPropagation();
    }
  }

  return (
    <div
      onClickCapture={handleClickCapture}
      onPointerDownCapture={handlePointerDownCapture}
      style={{ display: "contents" }}
    >
      <BaseGainField {...props} />
    </div>
  );
}

export { OffsetFlowFigure, ThresholdField };
