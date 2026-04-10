# Network Testing Guide

## Testing from Another Device (Phone, Laptop, etc.)

### Step 1: Find Your Machine's IP Address

**Windows:**
```powershell
ipconfig
```
Look for "IPv4 Address" under your active network adapter (usually starts with 192.168.x.x)

**Example:** `192.168.1.8`

---

### Step 2: Update Configuration Files

**1. Update `frontend/candidatePages/.env.local`:**
```env
NEXT_PUBLIC_API_URL=http://192.168.1.8:3002/api/v1
```

**2. Update `frontend/portal/.env.local`:**
```env
VITE_API_URL=http://192.168.1.8:3001/api/v1
```

Replace `192.168.1.8` with your actual IP address in both files.

**3. Update `frontend/candidatePages/next.config.ts`:**
```typescript
const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.1.8'], // Your IP here
};
```

**4. Portal Vite config is already set to listen on all interfaces** ✅

---

### Step 3: Ensure Servers Listen on All Interfaces

Both servers are now configured to listen on `0.0.0.0`:
- ✅ Portal Server: Configured in `server.ts` and `vite.config.ts`
- ✅ Candidate Server: Configured in `server.ts`

---

### Step 4: Configure Windows Firewall

**Allow Node.js through Windows Firewall:**

1. Open Windows Defender Firewall
2. Click "Allow an app or feature through Windows Defender Firewall"
3. Click "Change settings"
4. Find "Node.js" or click "Allow another app..."
5. Browse to: `C:\Program Files\nodejs\node.exe`
6. Check both "Private" and "Public" networks
7. Click OK

**Or use PowerShell (Run as Administrator):**
```powershell
# Allow port 3000 (Next.js)
New-NetFirewallRule -DisplayName "Next.js Dev" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Allow port 3001 (Portal)
New-NetFirewallRule -DisplayName "Portal Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Allow port 3002 (Candidate API)
New-NetFirewallRule -DisplayName "Candidate Server" -Direction Inbound -LocalPort 3002 -Protocol TCP -Action Allow
```

---

### Step 5: Restart Servers

**Kill existing processes:**
```powershell
.\kill-ports.ps1
```

**Start servers:**
```powershell
.\start-all.ps1
```

Or manually:
```powershell
# Terminal 1 - Portal
cd frontend/portal
npm run dev

# Terminal 2 - Candidate Pages
cd frontend/candidatePages
npm run dev
```

---

### Step 6: Access from Other Device

**From your other laptop/phone, open browser and go to:**

- **Candidate Pages:** `http://192.168.1.8:3000`
- **Portal (Admin/Recruiter):** `http://192.168.1.8:3001`

Replace `192.168.1.8` with your actual IP address.

---

## Troubleshooting

### "Failed to fetch" or "Network Error"

**Check 1: Can you ping the server?**
```powershell
# From the other device
ping 192.168.1.8
```

**Check 2: Is the firewall blocking?**
- Temporarily disable Windows Firewall to test
- If it works, add firewall rules (see Step 4)

**Check 3: Are servers running?**
```powershell
# On the server machine
Get-NetTCPConnection -LocalPort 3000,3001,3002
```

**Check 4: Check server logs**
- Look for CORS errors
- Look for connection errors

### "Cross-origin request blocked"

**Solution:** Already configured in `next.config.ts` with `allowedDevOrigins`

### "Cannot connect to localhost:3002"

**Problem:** The frontend is trying to connect to localhost instead of the network IP.

**Solution:** Update environment variables (see Step 2)

### Slow Loading

**Possible causes:**
1. Network latency (normal for WiFi)
2. Firewall scanning packets
3. Large bundle sizes in dev mode

**Tips:**
- Use wired connection if possible
- Disable antivirus temporarily for testing
- Production builds are much faster

---

## Quick Reference

| Service | Local URL | Network URL |
|---------|-----------|-------------|
| Candidate Pages (Next.js) | http://localhost:3000 | http://192.168.1.8:3000 |
| Portal Frontend (Vite) | http://localhost:3001 | http://192.168.1.8:3001 |
| Portal API Backend | http://localhost:3001/api/v1 | http://192.168.1.8:3001/api/v1 |
| Candidate API | http://localhost:3002/api/v1 | http://192.168.1.8:3002/api/v1 |

---

## Test Accounts

**Admin:**
- Email: `admin@coastalseven.com`
- Password: `admin123`

**Recruiter:**
- Email: `recruiter@coastalseven.com`
- Password: `recruiter123`

**Candidate:**
- Email: `candidate@example.com`
- Password: `candidate123`

---

## Reverting to Local-Only Mode

To go back to local-only development:

1. Update `frontend/candidatePages/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3002/api/v1
```

2. Update `frontend/portal/.env.local`:
```env
VITE_API_URL=http://localhost:3001/api/v1
```

3. Restart servers

4. Access via `http://localhost:3000` and `http://localhost:3001`

---

## Security Note

⚠️ **Development servers are NOT secure for production use!**

- Only use on trusted networks (home/office WiFi)
- Never expose to the internet
- Use VPN if testing remotely
- Disable network access when not needed
