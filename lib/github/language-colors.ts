/** GitHub Linguist colors for common languages (https://github.com/github-linguist/linguist). */
const LINGUIST_COLORS: Record<string, string> = {
  TypeScript: '#3178c6',
  JavaScript: '#f1e05a',
  Python: '#3572A5',
  Java: '#b07219',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Swift: '#F05138',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#663399',
  SCSS: '#c6538c',
  Vue: '#41b883',
  Svelte: '#ff3e00',
  Markdown: '#083fa1',
  JSON: '#292929',
  YAML: '#cb171e',
  Dockerfile: '#384d54',
  SQL: '#e38c00',
  R: '#198CE7',
  Scala: '#c22fe5',
  Elixir: '#6e4a7e',
  Haskell: '#5e5086',
  Lua: '#000080',
  Perl: '#0298c3',
  PowerShell: '#012456',
  Jupyter: '#DA5B0B',
  Makefile: '#427819',
  HCL: '#844FBA',
  Terraform: '#844FBA',
  Zig: '#ec915c',
  Nix: '#7e7eff',
}

const FALLBACK_COLOR = '#858585'

export function getGitHubLanguageColor(language: string): string {
  return LINGUIST_COLORS[language] ?? FALLBACK_COLOR
}
