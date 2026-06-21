@AGENTS.md

## Fork Sync Strategy

This repo is a fork of `alibaba/page-agent`. Two remotes are configured:
- `origin` → `hanmarco/page-agent` (my fork)
- `upstream` → `alibaba/page-agent` (original)

### Branch Rules
- `main` — mirrors upstream exactly. Never commit directly here.
- `custom` — all personal changes, always rebased on top of `main`.

### Syncing upstream updates

```bash
git fetch upstream
git checkout main
git merge upstream/main --ff-only
git push origin main

git checkout custom
git rebase main
git push origin custom --force-with-lease
```

If rebase conflicts occur, resolve them manually, then:

```bash
git add <conflicted files>
git rebase --continue
```
