import type { Story } from "../../types";
import { CA_DAO_STORIES } from "./ca-dao";
import { CENTRAL_STORIES } from "./central";
import { DONG_DAO_STORIES } from "./dong-dao";
import { TIER0_STORIES } from "./tier0";

/**
 * The shipped corpus, in no particular order: the library sorts by tier and
 * readiness, never by position in this array.
 */
export const STORIES: Story[] = [
  ...TIER0_STORIES,
  ...DONG_DAO_STORIES,
  ...CENTRAL_STORIES,
  ...CA_DAO_STORIES,
];

export { CA_DAO_STORIES, CENTRAL_STORIES, DONG_DAO_STORIES, TIER0_STORIES };
