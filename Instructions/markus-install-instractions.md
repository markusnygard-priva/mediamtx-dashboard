# Markus Install Instructions

This document provides step-by-step instructions for installing and configuring the mediamtx-dashboard to connect to a remote mediamtx-server.

## Prerequisites
- Node.js and pnpm installed
- Access to the mediamtx-dashboard codebase
- Remote mediamtx-server running at 192.168.8.23

## Installation Steps

1. **Clone the Repository**
   ```sh
   git clone <repo-url>
   cd mediamtx-dashboard
   ```

2. **Install Dependencies**
   ```sh
   pnpm install
   ```

3. **Configure API Endpoint**
   - Ensure all API/server references in the dashboard point to `192.168.8.23`.
   - Update any configuration files or environment variables as needed.

4. **Start the Dashboard**
   ```sh
   pnpm dev
   ```

5. **Access the Dashboard**
   - Open your browser and go to `http://localhost:3000` (or the port specified in your config).

## Notes
- This dashboard is configured to connect only to the remote mediamtx-server at `192.168.8.23`.
- For any changes to the server address, update the relevant configuration files and restart the dashboard.

---
This file will be kept up to date with any further installation or configuration changes.
