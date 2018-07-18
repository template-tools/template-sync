import test from 'ava';
import { astMerge } from '../src/ast-merge';

const recast = require('recast');
const babylon = require('recast/parsers/babylon');

function merger(a, b) {
  const recastOptions = {
    parser: babylon
  };

  const astA = recast.parse(a, recastOptions);
  const astB = recast.parse(b, recastOptions);

  astMerge(astA.program.body[0], astB.program.body[0]);

  return recast.print(astA).code;
}

test.skip('ast merge', t => {
  t.is(
    merger(
      `{
      a: 1
    }`,
      `{
      b: 2
  };`
    ),
    `{ a: 1,
  b: 2}`
  );
});
