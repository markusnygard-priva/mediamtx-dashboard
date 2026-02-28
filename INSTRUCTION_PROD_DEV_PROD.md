This is the most critical document for your project. The goal here is to prevent that "symlink poison" from happening again by ensuring Windows never touches the installation process.

### `instruction_prod_to_dev_to_prod.md`

---

## 🛠 Phase 1: Moving from PROD to DEV

*Goal: Move from the stable, compiled version to the "Live Edit" version.*

1. **Stop Production:**
```powershell
docker compose -f docker-compose.prod.yml down

```


2. **The "Safety Wipe" (Crucial):**
Before starting Dev mode, delete the existing `node_modules` and `.next` folders on your D: drive. This removes any old "Windows-style" shortcuts.
```powershell
Remove-Item -Recurse -Force node_modules, .next

```


3. **Start Dev Mode:**
Use the `dev.yml` that contains the `npm install -g pnpm && pnpm install` command.
```powershell
docker compose -f docker-compose.dev.yml up -d

```


4. **Wait for the "Handshake":**
Follow the logs. The container will now download the **Linux-specific** binaries. Do not touch the browser until you see `ready - started server`.
```powershell
docker logs -f mediamtx-dashboard-dev

```



---

## ✍️ Phase 2: Making Changes

*Goal: Edit your code and add features.*

1. **Edit Files:** Open VS Code on your D: drive. Edit `app/page.tsx` or `lib/mediamtx-api.ts`.
2. **Save & Refresh:** Every time you hit **Save**, the browser at `localhost:3000` will refresh automatically.
3. **Adding New Libraries:**
If you need a new package (e.g., a new icon set), **NEVER** run `pnpm install` in Windows. Run it **inside** the container:
```powershell
docker exec -it mediamtx-dashboard-dev pnpm add <package-name>

```



---

## 🚀 Phase 3: Moving from DEV back to PROD

*Goal: Lock in your changes and go back to high-performance mode.*

1. **Stop Dev Mode:**
```powershell
docker compose -f docker-compose.dev.yml down

```


2. **The Production Build:**
The production version needs to "bake" your changes into a permanent build.
```powershell
# Start the prod container
docker compose -f docker-compose.prod.yml up -d --build

```


*Note: Using `--build` forces Docker to re-read your new `page.tsx` and compile it.*
3. **Verify Production Performance:**
Access the dashboard via your standard port (likely port 80 or 3000 depending on your prod config). It should now be significantly faster than dev mode.

---

## 🚨 Troubleshooting: The "next: not found" Error

If you ever see the error `sh: next: not found` after switching:

1. **Down the container:** `docker compose -f docker-compose.dev.yml down`
2. **Clean the folder:** `Remove-Item -Recurse -Force node_modules`
3. **Check the YAML:** Ensure `docker-compose.dev.yml` has the "anonymous volume" line:
```yaml
volumes:
  - .:/app
  - /app/node_modules  # This protects Linux files from Windows

```


4. **Restart:** `docker compose -f docker-compose.dev.yml up -d`

---

### 🕒 Reminder: The 8-Day Logic

All your changes (the **+1 Year Life** button, **Frigate Cameras** button, and **Expiry Badges**) are now part of your source code. When you run Phase 3 (the `--build` command), these features become a permanent part of your production dashboard.

**Would you like me to generate the full `docker-compose.prod.yml` that matches this workflow perfectly?**