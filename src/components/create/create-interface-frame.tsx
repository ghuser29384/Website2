import { readFileSync } from "node:fs";
import path from "node:path";

import { integrateCommonGroundCreateSource } from "@/lib/create-interface/common-ground-integration";

interface CreateInterfaceFrameProps {
  resume?: boolean;
}

const createInterfaceSource = integrateCommonGroundCreateSource(
  readFileSync(
    path.join(process.cwd(), "public", "moral-trade-create", "index.html"),
    "utf8",
  ),
);
const resumeExpression =
  /const shouldResume\s*=\s*(?:new URLSearchParams\(window\.location\.search\)|createDraftResumeRequestUrl\(\)\.searchParams)\.get\("resume"\)\s*===\s*"create";/;

function getCreateInterfaceSource(resume: boolean) {
  if (!resume) return createInterfaceSource;
  if (!resumeExpression.test(createInterfaceSource)) {
    throw new Error("The Moral Trade Create resume contract could not be located.");
  }

  return createInterfaceSource.replace(
    resumeExpression,
    "const shouldResume = true;",
  );
}

export function CreateInterfaceFrame({ resume = false }: CreateInterfaceFrameProps) {
  return (
    <main id="main-content" style={{ minHeight: "100vh" }} tabIndex={-1}>
      <iframe
        allow="clipboard-write"
        aria-label="Moral Trade Create"
        data-create-interface-frame="true"
        srcDoc={getCreateInterfaceSource(resume)}
        style={{
          border: 0,
          display: "block",
          height: "100vh",
          minHeight: 720,
          width: "100%",
        }}
        title="Moral Trade Create"
      />
    </main>
  );
}
