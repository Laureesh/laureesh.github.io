import type { CSSProperties, InputHTMLAttributes } from "react";
import "./RangeSlider.css";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue"> & {
  value: number;
};

export default function RangeSlider({ value, min = 0, max = 100, style, className = "", ...props }: Props) {
  const lower = Number(min);
  const upper = Number(max);
  const progress = upper > lower ? Math.min(1, Math.max(0, (value - lower) / (upper - lower))) : 0;

  return <input {...props} type="range" min={min} max={max} value={value}
    className={`range-slider ${className}`}
    style={{ ...style, "--range-progress": progress } as CSSProperties} />;
}
