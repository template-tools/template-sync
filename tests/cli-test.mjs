import test from "ava";
import execa from "execa";

const nts = new URL("../src/npm-template-sync-cli.mjs",import.meta.url).pathname;

test("cli dryrun", async t => {
  const c = await execa(nts, ["--dry", "arlac77/config-expander"]);

  t.truthy(c.stdout.match(/\-|.+:.+/));
  t.is(c.exitCode, 0);
});

test("cli list properties", async t => {
  const c = await execa(nts, ["--list-properties", "arlac77/config-expander"]);
  t.truthy(c.stdout.match(/Expands expressions in config files/));

  t.is(c.exitCode, 0);
});
