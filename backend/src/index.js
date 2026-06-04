import "dotenv/config";
import { web } from "./application/web.js";
import { startAutoCancelJob } from "./jobs/auto-cancel-job.js";

// Port dari environment variable atau default 5000
const PORT = process.env.PORT || 5000;

web.listen(PORT, () => {
  console.log(`🍪 Utique API berjalan di http://localhost:${PORT}`);

  // Daftarkan background jobs setelah server berjalan
  startAutoCancelJob();
});
