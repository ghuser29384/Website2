const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');
const root = path.resolve(process.argv[2] || '.');
const requireApp = createRequire(path.join(root, 'package.json'));
const { chromium, expect } = requireApp('@playwright/test');
const { build } = requireApp('esbuild');
const output = path.join(root, 'start-guided-evidence');
const origin = 'http://127.0.0.1:3210';
const result = { startedAt: new Date().toISOString(), source: process.env.EXPECTED_SHA, pages: [] };

(async () => {
 fs.mkdirSync(output, { recursive: true });
 const server = spawn('npm', ['run','start','--','-H','127.0.0.1','-p','3210'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
 const log = fs.createWriteStream(path.join(output,'preview-server.log'));
 server.stdout.pipe(log); server.stderr.pipe(log);
 let browser;
 try {
  let ready = false;
  for (let attempt=0;attempt<60;attempt++) {
   try { if ((await fetch(origin+'/start')).ok) { ready=true;break; } } catch {}
   await new Promise(r=>setTimeout(r,1000));
  }
  assert.ok(ready,'Production-built app did not start');
  browser = await chromium.launch();
  let shell, styles;
  for (const width of [1440,390,320]) {
   const context = await browser.newContext({ viewport: {width,height:width===1440?1050:844}, extraHTTPHeaders:{DNT:'1'} });
   await context.addCookies([{name:'mt_analytics_opt_out',value:'1',url:origin,sameSite:'Lax'}]);
   const page = await context.newPage();
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   const response=await page.goto(origin+'/start',{waitUntil:'networkidle'});
   assert.equal(response.status(),200);
   await expect(page.getByRole('heading',{level:1})).toHaveText('Different priorities. A better trade.');
   await page.evaluate(()=>document.fonts.ready);
   if(width===1440){
    shell=await page.locator('.page-shell').evaluate(element=>{
     const clone=element.cloneNode(true);
     clone.querySelectorAll('script,noscript').forEach(node=>node.remove());
     const intro=clone.querySelector('[data-testid="quick-walkthrough"]');
     const target=document.createElement('div');target.id='preview-root';intro.replaceWith(target);
     clone.querySelectorAll('a[href^="/"]').forEach(link=>{link.href='https://www.moraltrade.org'+link.getAttribute('href');link.target='_blank';link.rel='noopener noreferrer';});
     return clone.outerHTML;
    });
    const hrefs=await page.locator('link[rel="stylesheet"]').evaluateAll(nodes=>nodes.map(node=>node.href));
    styles=(await Promise.all(hrefs.map(async href=>{const res=await fetch(href);assert.ok(res.ok);return res.text();}))).join('\n');
   }
   const capture=async state=>{
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Horizontal overflow');
    const file=`start-${state}-${width}.png`;
    await page.screenshot({path:path.join(output,file),fullPage:true});
    result.pages.push({width,state,file,pageErrors:[...errors]});
   };
   await capture('exchange');
   await page.getByRole('button',{name:'Try different terms'}).click();
   await page.getByRole('button',{name:/^Proposal A/}).click();
   await expect(page.locator('.mt-start-verdict')).toContainText('Rae would decline');
   await page.getByRole('button',{name:/^Proposal B/}).click();
   await expect(page.locator('.mt-start-verdict')).toContainText('You would decline');
   await page.getByRole('button',{name:/^Proposal C/}).click();
   await expect(page.locator('.mt-start-verdict')).toContainText('A trade both would choose.');
   await capture('terms');
   await page.getByRole('button',{name:'See your next steps'}).click();
   await expect(page.locator('.mt-start-next').getByRole('link',{name:'Create a trade'})).toHaveAttribute('href','/signup?returnTo=/create');
   await capture('next');
   assert.deepEqual(errors,[]);
   await context.close();
  }
  const entry = `import React from 'react';
import { createRoot } from 'react-dom/client';
import { QuickWalkthrough } from './src/components/walkthrough/quick-walkthrough';
createRoot(document.getElementById('preview-root')).render(<QuickWalkthrough createAction={<a className="mt-start-primary" href="https://www.moraltrade.org/signup?returnTo=/create" target="_blank" rel="noopener noreferrer">Create a trade <span aria-hidden="true">→</span></a>}/>);`;
  const built=await build({stdin:{contents:entry,loader:'tsx',resolveDir:root,sourcefile:'preview.tsx'},absWorkingDir:root,bundle:true,write:false,outfile:'preview.js',format:'iife',platform:'browser',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'preview-link',setup(api){api.onResolve({filter:/^next\/link$/},()=>({path:'next-link',namespace:'preview'}));api.onLoad({filter:/.*/,namespace:'preview'},()=>({contents:`import React from 'react'; export default function Link({href,prefetch,children,...rest}){return React.createElement('a',{...rest,href:href.startsWith('/')?'https://www.moraltrade.org'+href:href,target:'_blank',rel:'noopener noreferrer'},children)}`,loader:'jsx',resolveDir:root}));}}]});
  let js=built.outputFiles.find(file=>file.path.endsWith('.js')).text;
  const extraCss=built.outputFiles.find(file=>file.path.endsWith('.css'))?.text||'';
  // Never distribute embedded font files. The self-contained preview uses system fonts.
  styles=styles.replace(/@font-face\s*\{[^}]*\}/gi,'');
  assert.ok(!/data:(?:font|application\/(?:font|x-font))/i.test(styles),'Embedded font data in export');
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Get started — interactive draft preview</title><style>'+styles+extraCss+':root{--font-body:Arial,Helvetica,sans-serif;--font-heading:Georgia,serif;--font-mono:monospace}.preview-caption{padding:10px 16px;background:#e8edf8;color:#334465;font:12px/1.5 Arial;text-align:center}'+ '</style></head><body><div class="preview-caption">Draft preview · example controls work locally · navigation links open the existing site</div>'+shell+'<script>'+js.replace(/<\/script/gi,'<\\/script')+'</script></body></html>';
  const htmlPath=path.join(output,'get-started-interactive-preview.html');fs.writeFileSync(htmlPath,html);
  const page=await browser.newPage();
  const previewErrors=[];page.on('pageerror',e=>previewErrors.push(e.message));
  await page.goto('file://'+htmlPath);
  await expect(page.getByRole('heading',{level:1})).toHaveText('Different priorities. A better trade.');
  await page.getByRole('button',{name:'Try different terms'}).click();
  await page.getByRole('button',{name:/^Proposal C/}).click();
  await expect(page.locator('.mt-start-verdict')).toContainText('A trade both would choose.');
  await page.getByRole('button',{name:'See your next steps'}).click();
  await expect(page.locator('.mt-start-next').getByRole('link',{name:'Create a trade'})).toHaveAttribute('href','https://www.moraltrade.org/signup?returnTo=/create');
  assert.deepEqual(previewErrors,[]);
  result.export={interactive:true,fonts:'system fallbacks; no font files embedded',pageErrors:previewErrors};
  result.passed=true;
 } catch(error){result.passed=false;result.error=String(error.stack||error);throw error;}
 finally{result.completedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2));if(browser)await browser.close();server.kill('SIGTERM');log.end();}
})().catch(error=>{console.error(error);process.exitCode=1;});
