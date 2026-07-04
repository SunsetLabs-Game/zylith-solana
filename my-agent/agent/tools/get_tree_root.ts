import { defineTool } from "eve/tools";
import { z } from "zod";

export default defineTool({
  description: "Retrieve the current Merkle tree root from the ASP backend.",
  inputSchema: z.object({}),
  async execute({}, ctx) {
    const aspUrl = process.env.VITE_ASP_URL || "https://asp-production-761c.up.railway.app";
    try {
      const response = await fetch(`${aspUrl}/tree/root`);
      if (!response.ok) {
        return { error: `ASP responded with status ${response.status}` };
      }
      const data = await response.json();
      return { root: data.root || data };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  },
});
