# Incarnate Word Citations

A [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) for finding citations in the works of Sri Aurobindo and The Mother via the [Incarnate Word](https://incarnateword.in) API.

## Usage

Requires [Bun](https://bun.sh) and [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
bun run scripts/search.ts \
  --q "the divine life" --phrase true --stripHtml true
```

Or use it as a Claude Code skill — Claude will call the search script and format citations automatically.

## What it searches

The complete published works of Sri Aurobindo (CWSA, SABCL, Arya) and The Mother (CWM, Agenda) hosted on [incarnateword.in](https://incarnateword.in).

See [SKILL.md](SKILL.md) for full skill documentation.
