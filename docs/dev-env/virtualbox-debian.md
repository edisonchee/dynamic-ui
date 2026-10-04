# Running Storybook in a VirtualBox Debian VM (Windows host)

How to run this repo's Storybook inside a Debian guest and open it in a browser
on the Windows host.

## The picture

```
 Windows host                          VirtualBox                Debian guest
 ───────────────                       ──────────                ────────────────────────────
 browser ──► http://localhost:6006 ──► NAT port-forward rule ──► 0.0.0.0:6006  storybook dev
             (127.0.0.1 on Windows)    host 6006 → guest 6006    (listens on every interface)
```

Three things must line up. If any one is missing, the browser shows
"connection refused" or "connection reset":

1. **Storybook listens on `0.0.0.0`, not just `127.0.0.1`.** Inside the VM,
   `127.0.0.1` only accepts connections from the VM itself. Traffic forwarded
   by VirtualBox arrives on the VM's network interface, so the server has to
   listen there too. `pnpm storybook` already passes `--host 0.0.0.0`.
2. **VirtualBox forwards a host port to the guest port.** With the default NAT
   adapter the VM has a private address that Windows can't reach directly. A
   port-forwarding rule is the bridge.
3. **Storybook accepts the Host header the browser sends.** Storybook rejects
   unknown hostnames (a DNS-rebinding defence). `localhost` and raw IP
   addresses are always accepted, so the setup below works without changes.

## 1. One-time VM network setup

### Option A — NAT + port forwarding (recommended)

Works with VirtualBox's default network adapter and keeps the VM invisible to
the rest of your network.

**GUI:** power the VM off (or leave it running; rules can be added live).
Then go to *Settings → Network → Adapter 1* (Attached to: **NAT**) *→
Advanced → Port Forwarding*, and add:

| Name | Protocol | Host IP | Host Port | Guest IP | Guest Port |
| --- | --- | --- | --- | --- | --- |
| storybook | TCP | 127.0.0.1 | 6006 | *(blank)* | 6006 |
| ssh *(optional, see §5)* | TCP | 127.0.0.1 | 2222 | *(blank)* | 22 |

- **Host IP `127.0.0.1`** means only your Windows machine can use the
  forward. Leave it blank and anyone on your Wi-Fi or office LAN could open
  your Storybook.
- **Guest IP blank** means "whatever address the VM has on the NAT network".

**Command line** (PowerShell on Windows; VM name as shown in VirtualBox):

```powershell
# VM powered off:
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" modifyvm "debian" --natpf1 "storybook,tcp,127.0.0.1,6006,,6006"
# VM running:
& "C:\Program Files\Oracle\VirtualBox\VBoxManage.exe" controlvm "debian" natpf1 "storybook,tcp,127.0.0.1,6006,,6006"
```

### Option B — Host-only adapter

Add *Adapter 2 → Host-only Adapter*. The VM gets an address such as
`192.168.56.101` (run `ip -4 addr` in the VM to see it), and Windows reaches
it directly at `http://192.168.56.101:6006`. You don't need per-port rules.
Storybook accepts IP addresses as-is. If you give the VM a hostname (e.g.
through your `hosts` file), start Storybook with `ALLOWED_HOSTS=thatname`.

## 2. Install Node and pnpm in Debian

Debian's own `nodejs` package lags behind. Vite 8 and Storybook 10 need Node
**22.12+**. This repo is tested on Node 22.22 and **24.21 (current LTS,
recommended)**.

```sh
sudo apt update && sudo apt install -y git curl ca-certificates

# nvm: installs Node per user, no sudo, easy to switch versions.
# (Check https://github.com/nvm-sh/nvm for the latest install command.)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
exec $SHELL            # reload the shell so `nvm` is on PATH
nvm install 24
node -v                # v24.x

# Corepack ships with Node 24. It reads "packageManager" in package.json
# and runs exactly that pnpm version (10.28.0), so everyone uses the same one.
corepack enable
```

The first `pnpm` command asks to download pnpm 10.28.0. Answer **Y**.

## 3. Clone inside the VM, not on a shared folder

```sh
cd ~ && git clone https://github.com/edisonchee/dynamic-ui.git
cd dynamic-ui
```

To try an unmerged pull request, `git checkout` its branch first.

Keep the clone on the VM's own disk (e.g. `~/dynamic-ui`), **not** in a
VirtualBox shared folder (`/media/sf_*`), for three reasons:

- **File watching:** Storybook reloads when a file changes, using Linux
  change notifications (inotify). Edits made from Windows to a shared folder
  don't trigger them, so nothing reloads.
- **Symlinks:** pnpm builds `node_modules` out of symlinks. Shared folders
  don't support those by default.
- **Speed:** installs and builds on shared folders are several times slower.

To edit from Windows, use VS Code Remote-SSH (§5). If you must use a shared
folder, start Storybook with `WATCH_POLLING=1 pnpm storybook`. The watcher then
checks files on a timer instead of waiting for notifications.

## 4. Run Storybook

```sh
cd ~/dynamic-ui/spikes/001-renderer
pnpm install
pnpm storybook
```

Wait for `Storybook ready!`, then open **http://localhost:6006** in your
Windows browser. Ignore the `http://0.0.0.0:6006` line Storybook prints. It
only tells you the server listens on every interface; it isn't a URL to open.

Stop it with `Ctrl+C`.

### What to try

- **Spike 001 → Scenarios → Playground.** Open the *Controls* panel, click the
  pencil ("Edit steps as JSON"), change a message (rename a `text`, change a
  data-model value, add a component), then click outside the box. The surface
  replays from scratch.
- Click **View details** in any story and open the *Actions* panel to see the
  action payload the agent would receive.
- Walk through the failure stories (Unknown Component, Malformed Message,
  Missing Data, Extra Prop). Each one matches a row in
  [decision record 001](../decisions/001-renderer.md#evidence-from-the-spike).
- If Storybook offers **Update story** or **Create new story** after you edit
  Controls, those buttons **write your edits into the `.stories.tsx` file**.
  Click *Reset* to discard them.

## 5. Optional: edit from Windows with VS Code Remote-SSH

1. In the VM: `sudo apt install -y openssh-server`.
2. Add the `ssh` forwarding rule from §1 (host 2222 → guest 22).
3. On Windows, add this to `%USERPROFILE%\.ssh\config`:

   ```
   Host debian-vm
     HostName 127.0.0.1
     Port 2222
     User <your-debian-username>
   ```

4. In VS Code, run *Remote-SSH: Connect to Host… → debian-vm* and open
   `~/dynamic-ui`.

Bonus: when you run `pnpm storybook` in VS Code's terminal, VS Code notices port
6006 and forwards it to Windows by itself (see the *Ports* tab). The VirtualBox
rule for 6006 then becomes optional.

## Troubleshooting

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Browser: *connection refused / reset* | Storybook not running, or no forwarding rule | In the VM, run `curl -I localhost:6006`. If it fails, start Storybook. If it works, check the rule in §1. On Windows, `Test-NetConnection localhost -Port 6006` checks the forward. |
| Browser shows **Invalid host** (403) | You used a hostname that isn't `localhost` or an IP | Use `http://localhost:6006`, or start with `ALLOWED_HOSTS=yourname pnpm storybook`. |
| `Port 6006 is not available. Exiting…` | Another Storybook is already running **in the VM** | Stop it (`Ctrl+C` in its terminal, or `pkill -f "storybook dev"`). We use `--exact-port` on purpose: silently moving to 6007 would break the forwarding rule. |
| VirtualBox can't add the rule, or Windows says 6006 is in use | Windows reserves some port ranges (Hyper-V, WSL, Docker) | Run `netsh interface ipv4 show excludedportrange protocol=tcp`. If 6006 is listed, forward another host port (e.g. **16006 → 6006**) and open `http://localhost:16006`. |
| Edits don't reload the page | Code is on a shared folder, or the inotify watch limit was hit | Move the clone (§3), or use `WATCH_POLLING=1 pnpm storybook`. For the limit: `echo fs.inotify.max_user_watches=524288 \| sudo tee /etc/sysctl.d/90-inotify.conf && sudo sysctl --system`. |
| Works in the VM, blocked from Windows, Option B | A firewall in the guest | Debian has none by default. If you installed `ufw`: `sudo ufw allow 6006/tcp`. |
| `pnpm install` hangs or fails with TLS errors | Corporate proxy or TLS inspection | `export HTTPS_PROXY=http://proxy:port`, then point Node at the corporate root CA: `export NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem`. Never turn TLS verification off. |
| `Ignored build scripts: esbuild` warning | pnpm 10 blocks dependency install scripts | Already handled: `package.json` allows exactly `esbuild` under `pnpm.onlyBuiltDependencies`. If you still see it, run `pnpm install` again from `spikes/001-renderer`. |
