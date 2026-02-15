# Incarnate Word Citations

A [Claude Code skill](https://docs.anthropic.com/en/docs/claude-code/skills) for finding citations in the works of Sri Aurobindo and The Mother via the [Incarnate Word](https://incarnateword.in) API.

## Install

Requires [Bun](https://bun.sh) and [Claude Code](https://docs.anthropic.com/en/docs/claude-code).

```bash
# Create the skill directory
mkdir -p ~/.claude/skills/incarnateword-citations/{scripts,references}

# Download the required files
BASE="https://raw.githubusercontent.com/cyberchitta/incarnateword-citations/main"
curl -sL "$BASE/SKILL.md"           -o ~/.claude/skills/incarnateword-citations/SKILL.md
curl -sL "$BASE/package.json"       -o ~/.claude/skills/incarnateword-citations/package.json
curl -sL "$BASE/scripts/search.ts"  -o ~/.claude/skills/incarnateword-citations/scripts/search.ts
curl -sL "$BASE/references/api.md"  -o ~/.claude/skills/incarnateword-citations/references/api.md

# Install dependencies
cd ~/.claude/skills/incarnateword-citations && bun install
```

Then in any Claude Code session, provide a quote and ask for its source — the skill activates automatically.

## Usage

```bash
bun run scripts/search.ts \
  --q "the divine life" --phrase true --stripHtml true --deepLink both
```

Or use it as a Claude Code skill — Claude will call the search script and format citations automatically.

**Note:** Deep link URLs (with `#pN` paragraph anchors) may require manual adjustment. See [SKILL.md](SKILL.md) for known limitations.

## What it searches

The complete published works of Sri Aurobindo (CWSA, SABCL, Arya) and The Mother (CWM, Agenda) hosted on [incarnateword.in](https://incarnateword.in).

See [SKILL.md](SKILL.md) for full skill documentation.
