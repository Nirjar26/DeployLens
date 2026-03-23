import cron from "node-cron";
import { runAggregator } from "./aggregator.service";

let isRunning = false;

export function startAggregatorJob(): void {
  if (process.env.NODE_ENV === "test") {
    console.log("Aggregator job disabled in test environment");
    return;
  }

  cron.schedule("*/2 * * * *", async () => {
    if (isRunning) {
      return;
    }

    isRunning = true;
    try {
      await runAggregator();
    } catch (err) {
      console.error("Aggregator job failed:", err);
    } finally {
      isRunning = false;
    }
  });

  console.log("Aggregator job started — running every 2 minutes");
}
