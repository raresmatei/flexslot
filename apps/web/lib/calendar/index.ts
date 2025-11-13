export type CalEvent = {
  id: string;
  start: Date;
  end: Date;
  title: string;
  type: "booked" | "blocked";
};

export interface CalendarProvider {
  list(resourceId: string): Promise<CalEvent[]>;
  createBlock(resourceId: string, start: Date, end: Date): Promise<CalEvent>;
  deleteBlock(resourceId: string, slotId: string): Promise<void>;
}

/** Later: inspect ResourceIntegration to pick Google/Outlook/etc. */
export async function resolveCalendarProvider(
  _resourceId: string
): Promise<CalendarProvider> {
  const mod = await import("./inapp");
  return new mod.InAppCalendar();
}
