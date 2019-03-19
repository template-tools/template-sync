import test from "ava";
import { merge } from "../src/travis";

test("travis simple", t => {
  const messages = [];

  t.deepEqual(
    merge(
      {
        language: "node_js",
        always: true 
      },
      {
        language: "node_js", 
        always: true 
      },
      undefined,
      messages
    ),
    {
      language: "node_js", 
      always: true 
    }
  );

  t.deepEqual(messages, [
  ]);
});

