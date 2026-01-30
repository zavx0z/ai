declare module "*.md" {
  const content: string
  export default content
}

import type { MetaFor } from "@metafor/meta"

declare var channel: BroadcastChannel
