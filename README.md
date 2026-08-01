# Meesho Seller Toolkit

A helper toolkit for Meesho resellers (artificial jewellery & home-kitchen categories):
bulk listing generator, photo variant styling, SEO tags, pricing/margin calculator,
niche picker, competitor price log, profit dashboard, ad budget planner, sales analyzer.

**Important:** This tool does not connect to your Meesho account and cannot upload
listings automatically. It generates content you copy into Meesho's Supplier Panel
yourself, or export as a CSV for Meesho's official bulk-upload feature. This is by
design — automating actions on Meesho's platform violates their seller terms and
risks account suspension.

## Run locally

```bash
npm install
npm run dev
```

Opens at http://localhost:5173

## Deploy to GitHub + Vercel

1. Create a new GitHub repository and push this folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com), click **Add New → Project**, and import
   the GitHub repo you just created.

3. Vercel will auto-detect this as a **Vite** project. Confirm these settings
   (they should be auto-filled):
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Click **Deploy**. In 1-2 minutes you'll get a live URL.

If you get a 404 after deploying, double check that the **Root Directory** in
Vercel's project settings points to the folder containing this `package.json`
(not a subfolder or the wrong repo).

## Project structure

```
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── vercel.json
└── src/
    ├── main.jsx      # React entry point
    ├── App.jsx       # All toolkit features
    └── index.css     # Tailwind imports
```
