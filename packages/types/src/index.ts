import { z } from "zod";

export const HoldRequest = z.object({
  resourceId: z.string(),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  customerEmail: z.string().email(),
});
export type HoldRequest = z.infer<typeof HoldRequest>;
