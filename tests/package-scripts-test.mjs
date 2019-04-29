import test from "ava";
import {
  decodeScripts,
  encodeScripts,
  mergeScripts
} from "../src/package-scripts.mjs";

test("package scripts decode/encode empty script", t => {
  const d = decodeScripts(undefined);
  t.is(encodeScripts(d), undefined);
});

test("package scripts decode/encode scripts &&", t => {
  const d = decodeScripts({
    a: "#overwrite xx && yy&&zz",
    b: "XXX YYY ZZZ"
  });

  t.deepEqual(d, {
    a: { overwrite: true, op: "&&", args: ["xx", "yy", "zz"] },
    b: { overwrite: false, value: "XXX YYY ZZZ" }
  });

  d.a.args[1] = "yy2";

  t.deepEqual(encodeScripts(d), {
    a: "xx && yy2 && zz",
    b: "XXX YYY ZZZ"
  });
});

test("package scripts merge scripts && no dups", t => {
  t.deepEqual(
    mergeScripts(
      decodeScripts({
        a: "xx && zz"
      }),
      decodeScripts({
        a: "xx && yy"
      })
    ),
    {
      a: { op: "&&", args: ["xx", "yy", "zz"] }
    }
  );
});

test("package scripts merge undefined", t => {
  let d1 = decodeScripts({
    a: "xx && yy"
  });

  t.deepEqual(mergeScripts(undefined, d1), {
    a: { op: "&&", args: ["xx", "yy"] }
  });

  d1 = decodeScripts({
    a: "xx && yy"
  });

  t.deepEqual(mergeScripts(d1, undefined), {
    a: { overwrite: false, op: "&&", args: ["xx", "yy"] }
  });

  t.is(mergeScripts(undefined, undefined), undefined);
});

test("package scripts decode/merge/encode", t => {
  const d1 = decodeScripts({
    a: "xx && yy"
  });

  const d2 = decodeScripts({
    a: "xx"
  });

  t.deepEqual(mergeScripts(d1, d2), {
    a: { op: "&&", args: ["xx", "yy"] }
  });
});

test("package scripts decode/merge/encode overwrite", t => {
  const d1 = decodeScripts({
    a: "xx"
  });

  const d2 = decodeScripts({
    a: "#overwrite xxx"
  });

  t.deepEqual(mergeScripts(d1, d2), {
    a: { overwrite: false, value: "xxx" }
  });
});

test("package scripts decode/merge/encode swapped", t => {
  const d1 = decodeScripts({
    a: "xx && yy"
  });

  const d2 = decodeScripts({
    a: "xx"
  });

  t.deepEqual(mergeScripts(d2, d1), {
    a: { op: "&&", args: ["xx", "yy"] }
  });
});

test("package scripts decode/merge/encode remove", t => {
  const d1 = decodeScripts({
    a: "xx && yy"
  });

  const d2 = decodeScripts({
    a: "-"
  });

  t.deepEqual(mergeScripts(d1, d2), {});
});
