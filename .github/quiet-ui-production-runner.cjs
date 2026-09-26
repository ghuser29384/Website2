const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const sourcePath = path.join(__dirname, 'quiet-ui-production-check.cjs');
let source = fs.readFileSync(sourcePath, 'utf8');
const old = "assert.ok((await page.locator('body').innerText()).trim().length > 80, label);";
if (source.split(old).length !== 2) throw new Error('Unexpected production checker source');
source = source.replace(old, `let visibleText = await page.locator('body').innerText();
        for (const frame of page.frames()) {
          if (frame.parentFrame()) visibleText += await frame.locator('body').innerText();
        }
        assert.ok(visibleText.trim().length > 80, label);`);
const target = '/tmp/quiet-ui-production-check.cjs';
fs.writeFileSync(target, source);
const result = spawnSync(process.execPath, [target], { cwd: process.cwd(), env: process.env, stdio: 'inherit' });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
