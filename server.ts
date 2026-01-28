import { serve, file } from "bun"
import index from "./index.html"

const server = serve({
  port: 9999,
  routes: {
    "/": index,
    "/zavx0z/json-patch-manager/json-patch-manager.json": file("./meta/zavx0z/json-patch-manager/json-patch-manager.json"),
    "/metafor.js": file("/Users/zavx0z/zavx0z/metafor/dist/metafor.js"),
    "/metafor.js.map": file("/Users/zavx0z/zavx0z/metafor/dist/metafor.js.map"),
  },
})

console.log(`Listening at http://${server.hostname}:${server.port}`)
