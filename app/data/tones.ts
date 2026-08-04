import type { Bi, ToneKey } from "../types";
import { bi } from "./helpers";

export interface ToneEntry {
  key: ToneKey;
  label: Bi;
  mark: string;
  example: string;
  description: Bi;
  /**
   * A stylised teaching contour, 0 (low) to 1 (high), not a measurement.
   * The tone lab says so on screen: it is the shape a learner is aiming at, not
   * a pitch track of a recorded Đà Nẵng speaker.
   */
  contour: number[];
}

/**
 * Five spoken shapes, six written marks. Đà Nẵng and Quảng Nam merge hỏi and ngã
 * into one contour, which is why they share an entry here while the written
 * distinction is preserved everywhere it is displayed.
 */
export const TONES: ToneEntry[] = [
  {
    key: "ngang",
    label: bi("level", "ngang"),
    mark: "",
    example: "ma",
    description: bi("steady and level", "cao và bằng"),
    contour: [0.5, 0.5, 0.5, 0.5, 0.5],
  },
  {
    key: "huyen",
    label: bi("falling", "huyền"),
    mark: "`",
    example: "mà",
    description: bi("low and falling", "thấp dần"),
    contour: [0.6, 0.52, 0.44, 0.36, 0.3],
  },
  {
    key: "sac",
    label: bi("rising", "sắc"),
    mark: "´",
    example: "má",
    description: bi("bright and rising", "sáng và lên"),
    contour: [0.35, 0.44, 0.55, 0.7, 0.85],
  },
  {
    key: "hoi-nga",
    label: bi("dip / rise", "hỏi / ngã"),
    mark: "ˇ",
    example: "mả / mã",
    description: bi("down, then up", "hạ rồi lên"),
    contour: [0.58, 0.43, 0.28, 0.4, 0.62],
  },
  {
    key: "nang",
    label: bi("heavy", "nặng"),
    mark: ".",
    example: "mạ",
    description: bi("short and low", "ngắn và thấp"),
    contour: [0.45, 0.36, 0.25, 0.2, 0.18],
  },
];
