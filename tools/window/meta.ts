import { Atom } from "@metafor/atom"

const window = MetaFor("window")
  .context((t) => ({
    activeTabIndex: t.number.required(1, { label: "Активная вкладка" }),
    width: t.number.optional({ label: "Ширина" }),
    height: t.number.optional({ label: "Высота" }),
    x: t.number.optional({ label: "X" }),
    y: t.number.optional({ label: "Y" }),
    mode: t.enum("normal", "incognito").required("normal", { label: "Режим" }),
  }))
  .states({})
  .core({})
  .processes((process) => ({
    "получение адреса": process().action(() => ({})),
  }))

const tabNoumenon = MetaFor("tab")
  .context((t) => ({
    title: t.string.required("", { label: "Заголовок" }),
    url: t.string.required("", { label: "URL" }),
    index: t.number.required(0, { label: "Индекс" }),
    active: t.boolean.required(false, { label: "Активная" }),
  }))
  .states({
    активна: {
      "не активна": {},
    },
    "не активна": {},
  })
  .core({})
  .processes((process) => ({
    активна: process().action(() => ({})),
  }))
  .reactions()
  .view()

const atom = Atom.fromSchema({ meta: tabNoumenon })
