import "dotenv/config";
import { web } from "./application/web.js";
import { startAutoCancelJob } from "./jobs/auto-cancel-job.js";
import { logger } from "./application/logger.js";

// Port dari environment variable atau default 5000
const PORT = process.env.PORT || 5000;

web.listen(PORT, () => {
  logger.info(`🍪 Utique API berjalan di http://localhost:${PORT}`);

  // Daftarkan background jobs setelah server berjalan
  startAutoCancelJob();
});
