export const Theme = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  
  selected: "\x1b[36m❯ \x1b[1m",
  unselected: "  ",
  
  printTitle: (title: string) => {
    console.log(`\n${Theme.bold}🤖 AI Tool Wrapper${Theme.reset}`)
    console.log(`${Theme.yellow}${title}${Theme.reset}\n`)
  },
  
  clearScreen: () => {
    process.stdout.write("\x1b[2J\x1b[H")
  }
}