# DEVELOPER.md

This repository contains a **data adapter** for boundary layers such as precincts, counties, and districts.

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

- Install **Git**, **VS Code**, and [**Node.js**](https://nodejs.org/) (tested with Node 24).
- Open a terminal (bash, zsh, or **Git Bash**, not PowerShell).  

```bash
chmod +x .github/scripts/*.sh
npx npm-check-updates -u
npm install
npm run validate
npm test

# or

npm run check
```


## DEV 3. Update CHANGELOG and Push Changes

After changes, 

Update `CHANGELOG.md` with the new repo version:
1. Add a short description block near the top.  
2. Add a matching entry at the bottom.
   
Update `CITATION.cff` and manifest.json with the new incremented version. 
1. In CITATION, version appears twice. CHANGE date-released: yyyy-mm-dd ALSO.
2. In manifest, version appears once. 

```shell
git add .
git commit -m "Prep vx.y.z"
git push -u origin main
```

## DEV 4. Add Git tag and Push it

Wait for all GitHub Action checks to pass (green checks), then:

```shell
git tag vx.y.z -m "x.y.z"
git push origin vx.y.z
```

## DEV 5. Create Pull Request (PR)

After confirming all checks pass:

1. Go to your fork on GitHub.
2. Click **“Compare & pull request.”**
3. Verify:
   - **base repo:** `civic-interconnect/civic-data-boundaries-us-mn`
   - **base branch:** `main`
   - **compare branch:** your `main`
4. Add a short title and description, then click **Create Pull Request**.

## DEV 6. Update Zenodo, Citation, and push

After pushing a new tag:

1. Increment the version in `scripts/make_dataset_zip.sh`.
2. Create a new zipfile by running: `./scripts/make_dataset_zip.sh`
3. Upload new release archive (civic-data-boundaries-us-mn-2025-04-r#.zip) to Zenodo where # is the next incremental zipfile iteration. 
4. Zenodo generates a new record ID.
5. Copy that record DOI into CITATION.cff under preferred-citation.doi.
6. Copy that record into README.md Zenodo badge. 
7. Git add-commit-push CITATION.cff and README.md updates referencing the new DOI.

