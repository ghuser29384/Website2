from pathlib import Path
import subprocess

def edit(path, changes):
 p=Path(path);s=p.read_text()
 for before,after,count in changes:
  assert s.count(before)==count,(path,before,s.count(before),count)
  s=s.replace(before,after)
 p.write_text(s)
 subprocess.run(['git','add','--',path],check=True)
old='["Home", "Trades", "Commitments", "Profile"]'
new='["Feed", "Discover", "Messages", "Commitments"]'
edit('tests/contact-page-layout.spec.ts',[(old,new,1)])
edit('tests/discover-home-visual-alignment.spec.ts',[(old,new,1),('toHaveText("Trades")','toHaveText("Discover")',1)])
edit('tests/exact-live-now-recommendations.spec.ts',[
 ('expect(home).toHaveText("Home")','expect(home).toHaveText("Feed")',1),
 ('      "Home",\n      "Trades",\n      "Commitments",\n      "Profile",','      "Feed",\n      "Discover",\n      "Messages",\n      "Commitments",',1),
 ('    const evidence = navigation.getByRole("link", { name: "Profile", exact: true });',
  '    await page.locator(".header-more > summary").click();\n    const evidence = page.locator(".header-more").getByRole("link", { name: "Profile", exact: true });',1),
])
edit('tests/homepage-narrow-header.spec.ts', [('name: "How it works", exact: true, includeHidden: true','name: "Tour", exact: true, includeHidden: true',1)])
edit('tests/offers-density.spec.ts', [
 ('publicPage.getByRole("button", { name: "Search", exact: true }).click()',
  'publicPage.getByTestId("directory-controls").getByRole("button", { name: "Search", exact: true }).click()',2),
])
edit('tests/public-routes.spec.ts',[
 (old,new,1),
 ('"Home", "Trades", "Commitments", "Profile",','"Feed", "Discover", "Messages", "Commitments",',1),
 ('feedControl).toHaveAccessibleName("Home")','feedControl).toHaveAccessibleName("Feed")',1),
 ('discoverControl).toHaveAccessibleName("Trades")','discoverControl).toHaveAccessibleName("Discover")',1),
])
edit('tests/walkthrough.spec.ts', [('name: "How it works", exact: true','name: "Tour", exact: true',1)])
expected=['tests/'+f+'.spec.ts' for f in ['contact-page-layout','discover-home-visual-alignment','exact-live-now-recommendations','homepage-narrow-header','offers-density','public-routes','walkthrough']]
actual=subprocess.check_output(['git','diff','--cached','--name-only'],text=True).splitlines()
assert sorted(actual)==sorted(expected),actual
subprocess.run(['git','diff','--cached','--check'],check=True)
print('Only seven existing browser test contracts adjusted to the selected labels, Profile relocation, and scoped search button. No assertions about safety, data, rendering or route behavior removed.')
