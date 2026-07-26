import fs from "node:fs";

const target = process.argv[2];
if (!target) throw new Error("Pass the transformed smoke-script path.");

let source = fs.readFileSync(target, "utf8");
const needle = "  result.feedbackPageDiagnostics = [...(result.feedbackPageDiagnostics ?? []), diagnostics];\n  await form.waitFor({ state: 'attached' });\n  await form.scrollIntoViewIfNeeded();\n";
const replacement = "  diagnostics.layout = await form.evaluate((node) => {\n    const chain = [];\n    let current = node;\n    while (current && chain.length < 16) {\n      const style = getComputedStyle(current);\n      const rect = current.getBoundingClientRect();\n      chain.push({\n        tag: current.tagName,\n        id: current.id || '',\n        className: typeof current.className === 'string' ? current.className : '',\n        display: style.display,\n        visibility: style.visibility,\n        opacity: style.opacity,\n        position: style.position,\n        overflow: style.overflow,\n        overflowX: style.overflowX,\n        overflowY: style.overflowY,\n        height: style.height,\n        minHeight: style.minHeight,\n        maxHeight: style.maxHeight,\n        clientHeight: current.clientHeight,\n        scrollHeight: current.scrollHeight,\n        offsetTop: current.offsetTop,\n        rect: { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height },\n      });\n      current = current.parentElement;\n    }\n    return {\n      viewport: { width: innerWidth, height: innerHeight, scrollX, scrollY },\n      document: {\n        documentElementClientHeight: document.documentElement.clientHeight,\n        documentElementScrollHeight: document.documentElement.scrollHeight,\n        bodyClientHeight: document.body.clientHeight,\n        bodyScrollHeight: document.body.scrollHeight,\n      },\n      chain,\n    };\n  });\n  result.feedbackPageDiagnostics = [...(result.feedbackPageDiagnostics ?? []), diagnostics];\n  await form.waitFor({ state: 'attached' });\n  await form.scrollIntoViewIfNeeded();\n";

if (!source.includes(needle)) throw new Error("Unable to locate the feedback layout diagnostic insertion point.");
source = source.replace(needle, replacement);
fs.writeFileSync(target, source);
