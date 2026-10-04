import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";
const fixtureURL = "http://127.0.0.1:3231";
const headers = {"x-auth-resolution-fixture-control":"auth-resolution-local-control-fixture"};
async function state(request: APIRequestContext, value: string) {
  expect((await request.post(`${fixtureURL}/__fixture/audit-state?state=${value}`,{headers})).ok()).toBe(true);
}
async function session(request:APIRequestContext,context:BrowserContext) {
  const result=await request.get(`${fixtureURL}/__fixture/session?mode=fast`,{headers});
  expect(result.ok()).toBe(true);
  const fixture=await result.json();
  await context.addCookies([{domain:"127.0.0.1",path:"/",httpOnly:true,sameSite:"Lax",secure:false,name:fixture.cookieName,value:fixture.cookieValue}]);
}

test.describe("Audit remediation with isolated account and source states",()=>{
  // Each case resets its own fixture and receives a fresh browser context.
  test.describe.configure({mode:"default"});
  test.use({locale:"zh-CN",timezoneId:"America/Los_Angeles"});
  test.beforeEach(async({request,context})=>{
    await request.post(`${fixtureURL}/__fixture/reset`,{headers});
    await context.addCookies([{domain:"127.0.0.1",path:"/",name:"mt_analytics_opt_out",value:"1"}]);
  });
  for(const width of [1440,390,320]) {
    test(`English compact populated commitments at ${width}px`,async({page,request,context},testInfo)=>{
      const errors:string[]=[];page.on("pageerror",error=>errors.push(error.message));
      await page.setViewportSize({width,height:900});
      await page.clock.setFixedTime(new Date("2026-09-26T01:00:00Z"));
      await session(request,context);await state(request,"populated");
      await page.goto("/commitments");
      await expect(page).toHaveTitle(/Commitments/);
      await expect(page.locator("#commitments-heading")).toHaveText("Commitments");
      await expect(page.locator("time").filter({hasText:"Friday, September 25, 2026"})).toBeVisible();
      await expect(page.getByText("Good evening, Auth Resolution QA.")).toBeVisible();
      await expect(page.getByTestId("commitments-incomplete")).toHaveCount(0);
      const summary=page.getByRole("region",{name:"Commitment summary"});
      await expect(summary).toBeVisible();
      await expect(summary.locator("strong")).toHaveText(["1","0","0","1","0"]);
      await expect(page.locator("[data-marketplace-left-nav]")).toHaveCount(0);
      await expect(page.getByText("0 in planner",{exact:true})).toHaveCount(0);
      await expect(page.getByText("If everything succeeds",{exact:true})).toHaveCount(0);
      await expect(page.getByRole("link",{name:"Private agreement",exact:true})).toBeVisible();
      await expect(page.getByText("$12.5",{exact:true}).first()).toBeVisible();
      await expect(page.getByText("€20",{exact:true}).first()).toBeVisible();
      await page.evaluate(()=>document.fonts.ready);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth)).toBeLessThanOrEqual(1);
      await page.screenshot({path:testInfo.outputPath(`commitments-${width}.png`),fullPage:false});
      await page.getByRole("navigation",{name:"Commitments sections"}).getByRole("link",{name:"Completed",exact:true}).click();
      await expect(page).toHaveURL(/tab=completed/);
      await expect(page.getByRole("navigation",{name:"Commitments sections"}).getByRole("link",{name:"Completed",exact:true})).toHaveAttribute("aria-current","page");
      expect(errors).toEqual([]);
    });
  }
  test("partial records expose a warning above qualified counts and retry keeps the view",async({page,request,context},testInfo)=>{
    await session(request,context);await state(request,"partial");
    await page.goto("/commitments?tab=completed&group=mechanism");
    const warning=page.getByTestId("commitments-incomplete");
    await expect(warning).toBeVisible();
    const summary=page.getByRole("region",{name:"Commitment summary"});
    await expect(summary.locator("strong")).toHaveText(["1 found","Count unavailable","Count unavailable","1 found","Count unavailable"]);
    expect((await warning.boundingBox())!.y).toBeLessThan((await summary.boundingBox())!.y);
    await expect(page.getByText("Deliberate isolated source failure")).toHaveCount(0);
    await page.screenshot({path:testInfo.outputPath("partial-records.png"),fullPage:false});
    await state(request,"populated");await warning.getByRole("link",{name:"Retry loading records"}).click();
    await expect(page).toHaveURL(/tab=completed&group=mechanism/);
    await expect(warning).toHaveCount(0);await expect(summary.locator("strong")).toHaveText(["1","0","0","1","0"]);
  });
  test("failed source is unknown rather than an empty account, and failed cart suppresses the projection",async({page,request,context})=>{
    await session(request,context);await state(request,"unavailable");await page.goto("/commitments");
    await expect(page.getByRole("heading",{name:"No commitments could be loaded."})).toBeVisible();
    await expect(page.getByRole("region",{name:"Commitment summary"}).locator("strong")).toHaveText(["Count unavailable","Count unavailable","Count unavailable","Count unavailable","Count unavailable"]);
    await state(request,"cart-unavailable");await page.reload();
    await expect(page.getByText("Saved offers could not be fully loaded. No projection is shown.",{exact:false})).toBeVisible();
    await expect(page.getByText("If everything succeeds",{exact:true})).toHaveCount(0);
  });
  test("English offer search uses recorded contribution and explicit party labels",async({page,request})=>{
    await state(request,"offers");await page.goto("/offers?view=live");
    // Use the canonical serialized facet key generated by the ordinary search UI.
    await page.getByLabel("Search proposals",{exact:true}).fill("under $50");
    await page.locator('form[data-smart-query-surface="offers"]').getByRole("button",{name:"Search",exact:true}).click();
    const row=page.getByTestId("proposal-row").first();
    await expect(row).toBeVisible();
    await row.locator("summary").click();
    await expect(row.locator("dt").filter({hasText:"Offer maker commits"}).locator("+ dd")).toHaveText("Maker will donate $25");
    await expect(row.locator("dt").filter({hasText:"Responding participant commits"}).locator("+ dd")).toHaveText("Respondent will contribute $10");
    await expect(page.getByTestId("proposal-search-boundary")).toContainText("shared pool caps");
    await state(request,"budget-unavailable");await page.reload();
    await expect(page.locator('[data-directory-state="unavailable"]')).toBeVisible();
    await expect(page.locator('[data-directory-state="empty"]')).toHaveCount(0);
  });
  test("proposed receipts never satisfy verified-only outcome search",async({page,request})=>{
    await state(request,"offers");await page.goto("/offers?view=live&verified=1");
    await expect(page.getByTestId("proposal-search-boundary")).toContainText("not verified outcomes");
    await expect(page.getByTestId("proposal-row")).toHaveCount(0);
  });
});
