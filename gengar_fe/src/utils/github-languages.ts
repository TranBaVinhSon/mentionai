// GitHub language colors based on https://github.com/ozh/github-colors
export const languageColors: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Ruby: '#701516',
  Go: '#00ADD8',
  Rust: '#dea584',
  Swift: '#FA7343',
  Kotlin: '#A97BFF',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Dockerfile: '#384d54',
  Makefile: '#427819',
  Vue: '#41b883',
  React: '#61dafb',
  Angular: '#dd0031',
  Svelte: '#ff3e00',
  Dart: '#00B4AB',
  Objective: '#438eff',
  R: '#198CE7',
  Scala: '#c22d40',
  Perl: '#0298c3',
  Haskell: '#5e5086',
  Elixir: '#6e4a7e',
  Clojure: '#db5855',
  Lua: '#000080',
  MATLAB: '#e16737',
  Julia: '#a270ba',
  Fortran: '#4d41b1',
  Pascal: '#E3F171',
  COBOL: '#555555',
  Assembly: '#6E4C13',
  Jupyter: '#DA5B0B',
  TeX: '#3D6117',
  Vim: '#199f4b',
  PowerShell: '#012456',
  Markdown: '#083fa1',
  YAML: '#cb171e',
  JSON: '#292929',
  XML: '#0060ac',
  SQL: '#e38c00',
  GraphQL: '#e10098',
  Solidity: '#AA6746',
  GLSL: '#5686a5',
  HLSL: '#aace60',
  WebAssembly: '#04133b',
};

export function getLanguageColor(language: string | null | undefined): string {
  if (!language) return '#6e7681'; // Default gray color
  return languageColors[language] || '#6e7681';
}

// Get icon component for programming languages
export function getLanguageIcon(language: string | null | undefined): string | null {
  if (!language) return null;
  
  // Map languages to specific icons if needed
  const iconMap: Record<string, string> = {
    JavaScript: 'js',
    TypeScript: 'ts',
    Python: 'py',
    Java: 'java',
    Ruby: 'rb',
    Go: 'go',
    Rust: 'rs',
    // Add more mappings as needed
  };
  
  return iconMap[language] || null;
}