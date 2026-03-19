# Operating Instructions
npm run build
npm run bookmarklet

# Streamlined Install
npm run bookmarklet:copy      # build + generate + copy URL to clipboard (best effort)
npm run bookmarklet:open      # build + generate + open docs/install.html
npm run bookmarklet:install   # build + copy + open installer page

# Host Installer via GitHub Pages
1. Push `docs/install.html` to `main`.
2. In GitHub: Settings → Pages.
3. Under "Build and deployment", set:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/docs`
4. Save, then use:
   - `https://<your-user>.github.io/<repo>/install.html`
