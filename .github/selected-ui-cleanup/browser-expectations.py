from pathlib import Path
import subprocess

def update(path, changes):
 p=Path(path); s=p.read_text()
 for before,after in changes:
  assert s.count(before)==1,(path,before,s.count(before))
  s=s.replace(before,after,1)
 p.write_text(s)
 subprocess.run(['git','add','--',path],check=True)

update('tests/returning-homepage.spec.ts',[
 ('["Home", "Trades", "Commitments", "Profile"]','["Feed", "Discover", "Messages", "Commitments"]'),
 ('primary.getByRole("link", { name: "Home", exact: true })','primary.getByRole("link", { name: "Feed", exact: true })'),
 ('primary.getByRole("link", { name: "Trades", exact: true })','primary.getByRole("link", { name: "Discover", exact: true })'),
 ('primary.getByRole("link", { name: "Profile", exact: true })).toHaveAttribute("href", "/profile")',
  'primary.getByRole("link", { name: "Messages", exact: true })).toHaveAttribute("href", "/messages")'),
])
update('tests/input-assist-hydration.spec.ts',[
 ('input[placeholder="Search offers, people, pools, or evidence"]','input[placeholder="Search offers"]'),
])
print('Aligned only the browser locators for the approved labels; hydration and account checks remain intact.')
