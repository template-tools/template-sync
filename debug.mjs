import { mergeTemplate } from "./src/template.mjs";
import { readFileSync } from "fs";

console.log(
  mergeTemplate(
    JSON.parse(readFileSync("8-left.json", { encoding: "utf8" })),
    JSON.parse(readFileSync("8-right.json", { encoding: "utf8" }))
  )
);
