import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Get the current status of the Anonymous Service Provider (ASP) backend.",
  inputSchema: z.object({}),
  async execute({}, ctx) {
    const aspUrl = process.env.VITE_ASP_URL || "https://asp-production-761c.up.railway.app";
    try {
      const response = await fetch(`${aspUrl}/status`);
      if (!response.ok) {
        return { error: `ASP responded with status ${response.status}` };
      }
      const data = await response.json();
      return { status: "online", url: aspUrl, data };
    } catch (err) {
      return { status: "offline", url: aspUrl, error: err instanceof Error ? err.message : String(err) };
    }
  },
});
