export interface FileEntry {
  name: string
  path: string
  isDirectory: boolean
  isSymlink: boolean
  isBroken: boolean
  target: string
  size: number
  mtime: Date
  stats?: any
}

export interface NavigationHistory {
  path: string
  cursorPosition: number
}

export interface RenderOptions {
  showHidden: boolean
  filter: string
  inFilterMode: boolean
  filterBuffer: string
  excludePatterns: RegExp[]
}

export interface ColorTheme {
  reset: string
  bold: string
  cyan: string
  green: string
  yellow: string
  blue: string
  magenta: string
  red: string
  gray: string
  bgSelected: string
  bgCursor: string
}

export interface KeyMapping {
  [key: string]: string
}
