#!/usr/bin/env python3
"""Tiny Hustlers merge gate: the basic checks every pull request must pass before it is merged.

Source of truth: tinyhustlers/hq `standards/merge-gate/`. Each repo carries a copy in `.github/merge-gate/`
plus its own `.github/merge-gate.json`. Python 3.9+ standard library only, so it runs anywhere.

Checks
  versions   every version file holds the same X.Y.Z; build numbers agree; the CHANGELOG's newest heading
             is that version
  release    on a PR, a changed version is exactly one semver step up from the base branch, every build
             number goes up by exactly 1, and a release PR's title and branch name match the version
  branches   only dev -> qa -> main promotions reach qa and main
  readme     no version number in README headings (versions live in CHANGELOG.md, so the README never goes stale)
  secrets    no keys, tokens or private keys in added lines; no .env, key, certificate or keystore files
  data       no real personal data in added lines: Canadian SINs, card numbers, personal email addresses,
             and no recordings (.wav, .m4a, .mp3, ...) outside the allow-listed asset folders

Usage
  merge_gate.py --base origin/dev [--title "Speakco v0.20.2: ..."] [--head-ref release_0.20.2] [--base-ref dev]
  merge_gate.py --all          # whole tree instead of the PR's added lines (nightly / local audit)
Exit code 1 when any check fails. Findings never print the secret itself.
"""
from __future__ import annotations

import argparse
import fnmatch
import json
import os
import re
import subprocess
import sys
from dataclasses import dataclass, field

CONFIG = ".github/merge-gate.json"
SEMVER = re.compile(r"^(\d+)\.(\d+)\.(\d+)$")

# Secret patterns: name -> regex. Kept specific so placeholders ("sk-ant-...", "whsec_...") don't match.
SECRET_PATTERNS = {
    "Anthropic key": r"sk-ant-[A-Za-z0-9_\-]{20,}",
    "OpenAI key": r"\bsk-(?:proj-)?[A-Za-z0-9]{32,}",
    "AWS access key": r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b",
    "GitHub token": r"\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,}",
    "Stripe secret": r"\b(?:sk|rk)_live_[A-Za-z0-9]{16,}",
    "Stripe webhook secret": r"\bwhsec_[A-Za-z0-9]{24,}",
    "Google API key": r"\bAIza[0-9A-Za-z_\-]{35}\b",
    "Slack token": r"\bxox[abprs]-[A-Za-z0-9-]{10,}",
    "Private key": r"-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY",
    "Supabase service role / JWT": r"\beyJhbGciOi[A-Za-z0-9_\-]{10,}\.eyJ[A-Za-z0-9_\-]*(?:c2VydmljZV9yb2xl|service_role)[A-Za-z0-9_\-]*\.[A-Za-z0-9_\-]{10,}",
    "Password in URL": r"\b[a-z][a-z0-9+.\-]*://[^\s:/@]+:[^\s@/]{6,}@[\w.\-]+",
}
SECRET_FILES = [".env", ".env.*", "*.pem", "*.key", "*.p12", "*.p8", "*.pfx", "*.jks", "*.keystore",
                "*.mobileprovision", "id_rsa", "id_ed25519", "*.sqlite", "*.db", "service-account*.json",
                "google-services.json", "GoogleService-Info.plist"]
SECRET_FILE_OK = [".env.example", ".env.sample", ".env.template", "*.example.*"]
RECORDING_FILES = ["*.wav", "*.m4a", "*.mp3", "*.webm", "*.caf", "*.aac", "*.ogg", "*.flac", "*.mp4", "*.mov"]
SAFE_EMAIL_DOMAINS = {"example.com", "example.org", "example.net", "example.ca", "test", "invalid", "localhost",
                      "tinyhustlers.com", "users.noreply.github.com", "noreply.github.com", "anthropic.com",
                      "company.com", "yourcompany.com", "domain.com", "email.com", "acme.com", "acme.co"}  # placeholders
EMAIL = re.compile(r"\b[A-Za-z0-9._%+\-]+@([A-Za-z0-9.\-]+\.[A-Za-z]{2,}|test|localhost|invalid)\b")
FILE_TLDS = {"png", "jpg", "jpeg", "gif", "svg", "webp", "ico", "pdf", "js", "ts", "tsx", "css", "json", "md", "html",
             "txt", "xml", "yml", "yaml", "lock", "map", "mjs", "cjs", "py", "sh", "wasm", "onnx", "bin", "zip"}
SIN = re.compile(r"(?<![\d\-])(\d{3})[ \-]?(\d{3})[ \-]?(\d{3})(?![\d\-])")
SIN_WORDS = re.compile(r"\bsin\b|social.insurance|\bnas\b|\bssn\b", re.I)  # numbers in SVG paths etc. need a label
CARD = re.compile(r"(?<![\d\-])(?:\d[ \-]?){12,18}\d(?![\d\-])")
TEST_CARDS = {"4242424242424242", "4000056655665556", "5555555555554444", "378282246310005", "4111111111111111",
              "4012888888881881", "5105105105105100", "6011111111111117"}
SKIP_SCAN = ["*.lock", "package-lock.json", "*.min.js", "*.svg", "*.png", "*.jpg", "*.jpeg", "*.gif", "*.ico",
             "*.webp", "*.woff", "*.woff2", "*.ttf", "*.pdf", "*.zip", "*.pbxproj", ".github/merge-gate/*"]
README_VERSION = re.compile(r"^\s{0,3}#{1,6}\s.*\bv?\d+\.\d+(?:\.\d+)?\b")
BRANCH_FLOW = {"main": {"dev", "qa"}, "qa": {"dev"}}


@dataclass
class Report:
    failures: list[str] = field(default_factory=list)
    passed: list[str] = field(default_factory=list)

    def check(self, name: str, problems: list[str]) -> None:
        if problems:
            self.failures.extend(f"[{name}] {p}" for p in problems)
        else:
            self.passed.append(name)


def git(*args: str) -> str:
    return subprocess.run(["git", *args], check=True, capture_output=True, text=True).stdout


def read(path: str, ref: str | None = None) -> str | None:
    try:
        if ref:
            return git("show", f"{ref}:{path}")
        with open(path, encoding="utf-8") as f:
            return f.read()
    except (OSError, subprocess.CalledProcessError, UnicodeDecodeError):
        return None


def luhn(digits: str) -> bool:
    total = 0
    for i, ch in enumerate(reversed(digits)):
        d = int(ch)
        if i % 2:
            d = d * 2 - 9 if d > 4 else d * 2
        total += d
    return total % 10 == 0


def match_any(path: str, patterns: list[str]) -> bool:
    name = os.path.basename(path)
    return any(fnmatch.fnmatch(path, p) or fnmatch.fnmatch(name, p) for p in patterns)


# ---------- versions ----------

def extract(cfg_entries: list[dict], ref: str | None = None) -> dict[str, list[str]]:
    """{label: [values]} for each configured file; a missing file or pattern gives []."""
    out: dict[str, list[str]] = {}
    for e in cfg_entries:
        text = read(e["path"], ref)
        label = e.get("label", e["path"])
        out[label] = re.findall(e["pattern"], text, re.M) if text is not None else []
    return out


def changelog_version(cfg: dict, ref: str | None = None) -> str | None:
    path = cfg.get("changelog")
    text = read(path, ref) if path else None
    if text is None:
        return None
    m = re.search(r"^##\s+v?(\d+\.\d+\.\d+)\b", text, re.M)
    return m.group(1) if m else ""


def current_version(cfg: dict, ref: str | None = None) -> str | None:
    vals = [v for vs in extract(cfg.get("versions", []), ref).values() for v in vs]
    return vals[0] if vals and len(set(vals)) == 1 else None


def check_versions(cfg: dict) -> list[str]:
    problems: list[str] = []
    found = extract(cfg.get("versions", []))
    for label, vals in found.items():
        if not vals:
            problems.append(f"{label}: version not found (pattern in {CONFIG} no longer matches)")
        for v in vals:
            if not SEMVER.match(v):
                problems.append(f"{label}: '{v}' is not MAJOR.MINOR.PATCH")
    distinct = sorted({v for vs in found.values() for v in vs})
    if len(distinct) > 1:
        problems.append("version files disagree: " + ", ".join(f"{k}={'/'.join(sorted(set(v)))}" for k, v in found.items() if v))
    builds = extract(cfg.get("builds", []))
    for label, vals in builds.items():
        if not vals:
            problems.append(f"{label}: build number not found")
    bdistinct = sorted({v for vs in builds.values() for v in vs})
    if len(bdistinct) > 1:
        problems.append("build numbers disagree: " + ", ".join(f"{k}={'/'.join(sorted(set(v)))}" for k, v in builds.items() if v))
    if len(distinct) == 1 and cfg.get("changelog"):
        top = changelog_version(cfg)
        if top is None:
            problems.append(f"{cfg['changelog']} is missing")
        elif top != distinct[0]:
            problems.append(f"newest {cfg['changelog']} heading is v{top or '?'} but the version is v{distinct[0]}")
    return problems


def bump_kind(old: str, new: str) -> str | None:
    """'patch' | 'minor' | 'major' when new is exactly one semver step above old, else None."""
    a, b = SEMVER.match(old), SEMVER.match(new)
    if not a or not b:
        return None
    o, n = tuple(map(int, a.groups())), tuple(map(int, b.groups()))
    if n == (o[0], o[1], o[2] + 1):
        return "patch"
    if n == (o[0], o[1] + 1, 0):
        return "minor"
    if n == (o[0] + 1, 0, 0):
        return "major"
    return None


def check_release(cfg: dict, base: str, title: str, head_ref: str, base_ref: str = "") -> list[str]:
    problems: list[str] = []
    new = current_version(cfg)
    old = current_version(cfg, base)
    title_v = re.search(r"\bv(\d+\.\d+\.\d+)\b", title or "")
    is_release_title = bool(re.match(r"^[^:]*\bv\d+\.\d+\.\d+\s*:", title or ""))
    branch_v = re.match(r"^release[_/\-]v?(\d+\.\d+\.\d+)$", head_ref or "")
    if new is None or old is None:
        return problems  # check_versions reports unreadable versions
    promotion = base_ref in BRANCH_FLOW  # dev -> qa -> main may carry several releases at once
    if promotion:
        if tuple(map(int, new.split("."))) < tuple(map(int, old.split("."))):
            problems.append(f"{base_ref} would go back from v{old} to v{new}")
        return problems
    if new != old:
        if not bump_kind(old, new):
            problems.append(f"v{old} -> v{new} is not one semver step (patch {old} -> x.y.z+1, minor -> x.y+1.0, major -> x+1.0.0)")
        old_b = [int(v) for vs in extract(cfg.get("builds", []), base).values() for v in vs]
        new_b = [int(v) for vs in extract(cfg.get("builds", []), None).values() for v in vs]
        if old_b and new_b and max(new_b) != max(old_b) + 1:
            problems.append(f"build number must go up by exactly 1 ({max(old_b)} -> {max(old_b) + 1}), found {max(new_b)}")
    if is_release_title and title_v and title_v.group(1) != new:
        problems.append(f"PR title says v{title_v.group(1)} but the version files say v{new}")
    if is_release_title and new == old and cfg.get("require_bump_on_release_title", True):
        problems.append(f"release PR title but the version is still v{old} (bump it)")
    if branch_v and branch_v.group(1) != new:
        problems.append(f"branch {head_ref} but the version files say v{new}")
    return problems


def check_branches(base_ref: str, head_ref: str) -> list[str]:
    allowed = BRANCH_FLOW.get(base_ref)
    if allowed is not None and head_ref and head_ref not in allowed:
        return [f"'{head_ref}' can't merge into {base_ref}: only {' or '.join(sorted(allowed))} is promoted to {base_ref} (dev -> qa -> main)"]
    return []


# ---------- readme ----------

def check_readme(cfg: dict) -> list[str]:
    problems = []
    for path in cfg.get("readme", ["README.md"]):
        text = read(path)
        if text is None:
            continue
        in_code = False
        for i, line in enumerate(text.splitlines(), 1):
            if line.lstrip().startswith("```"):
                in_code = not in_code
            if not in_code and README_VERSION.match(line):
                problems.append(f"{path}:{i}: version number in a heading ('{line.strip()[:60]}'); keep versions in CHANGELOG.md")
    return problems


# ---------- leaks ----------

def added_lines(base: str | None) -> tuple[dict[str, list[tuple[int, str]]], list[str]]:
    """({path: [(line_no, text)]}, [added or changed paths]) for the PR, or the whole tree with base=None."""
    if base is None:
        files = [f for f in git("ls-files").splitlines() if f]
        out: dict[str, list[tuple[int, str]]] = {}
        for f in files:
            text = read(f)
            if text is not None:
                out[f] = list(enumerate(text.splitlines(), 1))
        return out, files
    files = [f for f in git("diff", "--name-only", "--diff-filter=AMR", f"{base}...HEAD").splitlines() if f]
    out = {}
    cur, line_no = None, 0
    for raw in git("diff", "-U0", "--no-color", f"{base}...HEAD").splitlines():
        if raw.startswith("+++ "):
            cur = raw[6:] if raw.startswith("+++ b/") else None
        elif raw.startswith("@@"):
            m = re.search(r"\+(\d+)", raw)
            line_no = int(m.group(1)) if m else 0
        elif raw.startswith("+") and cur:
            out.setdefault(cur, []).append((line_no, raw[1:]))
            line_no += 1
    return out, files


def check_secrets(lines: dict, files: list[str], cfg: dict) -> list[str]:
    allow = cfg.get("allow_paths", [])
    problems = []
    for f in files:
        if match_any(f, SECRET_FILES) and not match_any(f, SECRET_FILE_OK) and not match_any(f, allow):
            problems.append(f"{f}: secret-type file must never be committed (add it to .gitignore)")
    compiled = {k: re.compile(v) for k, v in SECRET_PATTERNS.items()}
    for path, rows in lines.items():
        if match_any(path, SKIP_SCAN) or match_any(path, allow):
            continue
        for no, text in rows:
            for name, rx in compiled.items():
                if rx.search(text):
                    problems.append(f"{path}:{no}: looks like a {name} (value hidden). Remove it and rotate the key")
    return problems


def check_data(lines: dict, files: list[str], cfg: dict) -> list[str]:
    allow = cfg.get("allow_paths", [])
    rec_ok = cfg.get("allow_recordings", [])
    safe_domains = SAFE_EMAIL_DOMAINS | set(cfg.get("allow_email_domains", []))
    problems = []
    for f in files:
        if match_any(f, RECORDING_FILES) and not match_any(f, rec_ok):
            problems.append(f"{f}: audio/video file outside the allowed asset folders (personal recordings stay on the device)")
    for path, rows in lines.items():
        if match_any(path, SKIP_SCAN) or match_any(path, allow):
            continue
        for no, text in rows:
            for m in SIN.finditer(text):
                digits = "".join(m.groups())
                if digits[0] not in "08" and luhn(digits) and len(set(digits)) > 2 and (SIN_WORDS.search(text) or "-" in m.group(0)):
                    problems.append(f"{path}:{no}: looks like a real SIN (value hidden). Use a fake one that fails the checksum")
            for m in CARD.finditer(text):
                digits = re.sub(r"\D", "", m.group(0))
                if 13 <= len(digits) <= 19 and luhn(digits) and digits not in TEST_CARDS and digits[0] in "3456" and len(set(digits)) > 3:
                    problems.append(f"{path}:{no}: looks like a real card number (value hidden). Use a documented test card")
            for m in EMAIL.finditer(text):
                domain = m.group(1).lower()
                if domain.rsplit(".", 1)[-1] in FILE_TLDS:  # "AppIcon@2x.png", "pkg@1.2.js"
                    continue
                if not any(domain == d or domain.endswith("." + d) for d in safe_domains):
                    problems.append(f"{path}:{no}: personal email address ({m.group(0).split('@')[0][:2]}…@{domain}). Use @example.com")
    return problems


# ---------- main ----------

def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", help="git ref of the PR's base, e.g. origin/dev (omit with --all)")
    ap.add_argument("--all", action="store_true", help="scan the whole tree, not just the PR's added lines")
    ap.add_argument("--title", default=os.environ.get("PR_TITLE", ""))
    ap.add_argument("--head-ref", default=os.environ.get("HEAD_REF", ""))
    ap.add_argument("--base-ref", default=os.environ.get("BASE_REF", ""))
    ap.add_argument("--config", default=CONFIG)
    a = ap.parse_args(argv)
    if not a.all and not a.base:
        ap.error("give --base <ref> for a pull request, or --all")
    try:
        with open(a.config, encoding="utf-8") as f:
            cfg = json.load(f)
    except FileNotFoundError:
        print(f"merge gate: {a.config} is missing; copy it from tinyhustlers/hq standards/merge-gate/", file=sys.stderr)
        return 1

    r = Report()
    r.check("versions", check_versions(cfg))
    if not a.all:
        r.check("release", check_release(cfg, a.base, a.title, a.head_ref, a.base_ref))
        r.check("branches", check_branches(a.base_ref, a.head_ref))
    r.check("readme", check_readme(cfg))
    lines, files = added_lines(None if a.all else a.base)
    r.check("secrets", check_secrets(lines, files, cfg))
    r.check("data", check_data(lines, files, cfg))

    for name in r.passed:
        print(f"PASS {name}")
    for msg in r.failures:
        print(f"FAIL {msg}")
    print("Merge gate: " + ("FAILED, fix the items above before merging." if r.failures else "all checks passed."))
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as f:
            f.write("## Merge gate\n\n" + "\n".join([f"- ✅ {n}" for n in r.passed] + [f"- ❌ {m}" for m in r.failures]) + "\n")
    return 1 if r.failures else 0


if __name__ == "__main__":
    sys.exit(main())
