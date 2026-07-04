import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Check if a commitment's nullifier hash is spent on the ASP backend.",
  inputSchema: z.object({
    hash: z.string().describe("The nullifier hash in hex or base58 representation to check"),
  }),
  async execute({ hash }, ctx) {
    const aspUrl = process.env.VITE_ASP_URL || "https://asp-production-761c.up.railway.app";
    try {
      const response = await fetch(`${aspUrl}/nullifier/${hash}`);
      if (!response.ok) {
        return { error: `ASP responded with status ${response.status}` };
      }
      const data = await response.json();
      return { hash, isSpent: data.spent || data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },
});
