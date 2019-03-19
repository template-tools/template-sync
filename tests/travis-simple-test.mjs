import test from "ava";
import { merge } from "../src/travis";

test("travis simple", t => {
  const messages = [];

  t.deepEqual(
    merge(
      {
        language: "node_js" 
      },
      {
        language: "node_js" 
      },
      undefined,
      messages
    ),
    {
      language: "node_js" 
    }
  );

  t.deepEqual(messages, [
  ]);
});

