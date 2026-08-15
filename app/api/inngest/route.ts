import { serve } from "inngest/next";
import { inngest } from "../../../lib/inngest/client";
import { analyzeRfpJob } from "../../../lib/inngest/functions";

// Create an API that serves zero-dependency routing for Inngest
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    analyzeRfpJob
  ],
});
