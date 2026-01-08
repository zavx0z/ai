declare module '*.md' {
  const content: string;
  export default content;
}

declare module './rules.md' {
  import md from '*.md';
  export default md;
}