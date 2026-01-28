import "@metafor/meta"
import { Atom } from "@metafor/atom"

const meta = MetaFor("meta")
  .context((t) => ({}))
  .states({})
  .core()
  .processes()
  .reactions()
  .view()

const atom = Atom.fromSchema({ meta })
