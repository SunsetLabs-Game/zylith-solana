import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.resolve(__dirname, "../deployments");
const ANCHOR_TOML_PATH = path.resolve(__dirname, "../Anchor.toml");

function main() {
  console.log("Generating deployment metadata for Sunset Solana...");

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Parse Anchor.toml to get program IDs
  const anchorToml = fs.readFileSync(ANCHOR_TOML_PATH, "utf8");
  const programIdMatch = anchorToml.match(/sunset = "([^"]+)"/);
  
  if (!programIdMatch) {
    console.error("Could not find program ID in Anchor.toml");
    process.exit(1);
  }

  const programId = programIdMatch[1];
  
  const metadata = {
    network: "localnet",
    programs: {
      sunset: programId,
    },
    coordinator: programId, // In our implementation, they are the same program
    timestamp: new Date().toISOString(),
  };

  const outputPath = path.join(OUTPUT_DIR, "programs.json");
  fs.writeFileSync(outputPath, JSON.stringify(metadata, null, 2));
  
  console.log(`Metadata saved to ${outputPath}`);
  console.log(`Program ID: ${programId}`);
}

main();
