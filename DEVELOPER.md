# DEVELOPER.md

This is a **data repository** for boundary layers (precincts, counties, districts, etc.).
GitHub Actions validate and update GeoJSON files on push.

For most users:  
> Fork, add GeoJSON, push, check Actions, open PR.  

For maintainers:  
> Test local scripts as described below.

## DEV 1. Get the Code

1. Fork this repository on GitHub.
2. On your machine, open a terminal in the folder where you keep GitHub repositories (avoid using Documents or other automatically synced folders)
   1. clone your repo
   2. cd into your repo folder
   3. git pull if it's been a while

```bash
git clone https://github.com/YOUR_USERNAME/civic-data-boundaries-us-mn.git
cd civic-data-boundaries-us-mn
git pull origin main
```

## DEV 2. OPTIONAL: Set Up Machine and Project

To test or debug locally:

- Install **Git**, **VS Code**, and [**Node.js**](https://nodejs.org/).  
- Open a terminal (bash, zsh, or **Git Bash**, not PowerShell).  
- Make scripts executable and install `geojsonhint`:

```bash
chmod +x .github/scripts/*.sh
npm install -g @mapbox/geojsonhint
./.github/scripts/validate_geojson.sh
./.github/scripts/update_latest.sh
```

## DEV 3. Add or update data under `data/`.  

Add new data under the data folder. Follow conventions. 

## DEV 4. Update CHANGELOG and Push Changes

Update `CHANGELOG.md`:
1. Add a short description block near the top.  
2. Add a matching entry at the bottom.

```shell
git add .
git commit -m "Prep vx.y.z"
git push -u origin main
```

## DEV 5. Add Git tag and Push it

Wait for all GitHub Action checks to pass (green checks), then:

```shell
git tag vx.y.z -m "x.y.z"
git push origin vx.y.z
```

## DEV 6. Create Pull Request (PR)

After confirming all checks pass:

1. Go to your fork on GitHub.
2. Click **“Compare & pull request.”**
3. Verify:
   - **base repo:** `civic-interconnect/civic-data-boundaries-us-mn`
   - **base branch:** `main`
   - **compare branch:** your `main`
4. Add a short title and description, then click **Create Pull Request**.
