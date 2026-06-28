import { startCronJobs } from "../../src/lib/server/cron";

export default defineNitroPlugin(() => {
  startCronJobs();
});
