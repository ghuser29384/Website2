import { expect, test, type Route } from "@playwright/test";
const guest = {authenticated:false,status:"signed_out",recommendations:[]};
for(const width of [1440,390]) {
  test(`optional account and feed requests do not block the usable shell at ${width}px`,async({page},testInfo)=>{
    const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
    await page.setViewportSize({width,height:900});
    let account:Route|undefined;let feed:Route|undefined;
    await page.route("**/api/live-account",route=>{account=route;});
    await page.route("**/api/live-now",route=>{feed=route;});
    await page.goto("/",{waitUntil:"commit"});
    await expect(page.locator('header [data-mt-primary-links="true"]')).toBeVisible();
    await expect(page.locator('button[data-now="focus"]')).toBeVisible();
    await expect(page.locator('[data-mt-guest-only="true"]').first()).not.toBeVisible();
    await expect.poll(()=>Boolean(account&&feed)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`independent-shell-${width}.png`)});
    await account!.fulfill({contentType:"application/json",body:JSON.stringify({authenticated:false})});
    await expect(page.locator('[data-mt-guest-only="true"]').first()).toBeVisible();
    // Feed still pending, but the resolved account and navigation are usable.
    await expect(page.locator('button[data-now="focus"]')).toBeVisible();
    await feed!.fulfill({contentType:"application/json",body:JSON.stringify(guest)});
    await expect(page.locator('[data-mt-live-now-state="signed_out"]')).toBeVisible();
    await page.locator('button[data-now="plan"]').click();
    await expect(page.locator('button[data-now="plan"]')).toHaveClass(/active/);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test("feed can resolve first; account JSON is data, never executable document source",async({page})=>{
  let account:Route|undefined;
  await page.route("**/api/live-account",route=>{account=route;});
  await page.route("**/api/live-now",route=>route.fulfill({contentType:"application/json",body:JSON.stringify(guest)}));
  await page.goto("/",{waitUntil:"commit"});
  await expect(page.locator('[data-mt-live-now-state="signed_out"]')).toBeVisible();
  await expect.poll(()=>Boolean(account)).toBe(true);
  await account!.fulfill({contentType:"application/json",body:JSON.stringify({authenticated:true,account:{displayName:"</script><script>window.auditInjected=1</script>",firstName:"Audit QA",initials:"AQ"}})});
  await expect(page.locator('button[data-action="profile"]')).toContainText("AQ");
  expect(await page.evaluate(()=>Object.hasOwn(window,"auditInjected"))).toBe(false);
  await expect(page.locator('[data-mt-guest-only="true"]').first()).not.toBeVisible();
});

test("failed optional sources show unavailable rather than demo records",async({page})=>{
  await page.route("**/api/live-account",route=>route.fulfill({status:503,body:"unavailable"}));
  await page.route("**/api/live-now",route=>route.fulfill({status:503,body:"unavailable"}));
  await page.goto("/",{waitUntil:"commit"});
  await expect(page.locator('[data-mt-live-now-state="unavailable"]')).toBeVisible();
  await expect(page.locator('[data-mt-live-now-recommendation]')).toHaveCount(0);
  await expect(page.locator('[data-mt-guest-only="true"]').first()).not.toBeVisible();
  await expect(page.locator('header [data-mt-primary-links]')).toBeVisible();
  await page.locator('button[data-action="profile"]').click();
  await expect(page.locator('[data-mt-live-account-summary="true"]')).toContainText("could not be loaded");
  await expect(page.locator('[data-mt-live-account-panel="true"]').getByText("Sign in to view", {exact:true})).toHaveCount(0);
  await expect(page.locator('[data-mt-live-account-manage="true"]')).toHaveAttribute("href", "/dashboard");
});

test("a stalled feed reaches an unavailable state within its bounded wait",async({page})=>{
  await page.route("**/api/live-account",route=>route.fulfill({contentType:"application/json",body:JSON.stringify({authenticated:false})}));
  await page.route("**/api/live-now",()=>{});
  await page.goto("/",{waitUntil:"commit"});
  await expect(page.locator('header [data-mt-primary-links]')).toBeVisible();
  await expect(page.locator('[data-mt-live-now-state="unavailable"]')).toBeVisible({timeout:12000});
});

test("a failed core download keeps escape links and a retry explanation",async({page})=>{
  await page.route("**/moral-trade-live-core.txt",route=>route.fulfill({status:503,body:"unavailable"}));
  await page.goto("/",{waitUntil:"commit"});
  await expect(page.locator(".boot-nav")).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Please refresh");
  await expect(page.locator('.boot-nav a[href="/discover"]')).toBeVisible();
});
