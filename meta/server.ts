import { serve, file } from "bun"
import index from "./index.html"

const server = serve({
  port: 9999,
  routes: {
    "/": index,
    "/virtual/dist/worker.js": file("/Users/zavx0z/zavx0z/metafor/infra/virtual/dist/worker.js"),
    "/json-patch-manager.ts": file("./json-patch-manager.ts"),
    "/metafor.js": file("/Users/zavx0z/zavx0z/metafor/dist/metafor.js"),
    "/metafor.js.map": file("/Users/zavx0z/zavx0z/metafor/dist/metafor.js.map"),
  },
})

console.log(`Listening at http://${server.hostname}:${server.port}`)
