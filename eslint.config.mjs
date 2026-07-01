import { defineConfig } from "eslint/config";
import next from "eslint-config-next";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig([{
    extends: [...next],
    rules: {
        // This codebase intentionally uses two patterns the strict rule flags as
        // errors but are idiomatic here: (1) SSR/hydration guards that flip a
        // `mounted`/`hydrated` flag on first client paint, and (2) syncing async
        // React Query data into an editable local form/Map copy. Both are
        // accepted React patterns; keep the rule visible as a warning rather than
        // silencing per-line across six files.
        "react-hooks/set-state-in-effect": "warn",
    },
}]);
