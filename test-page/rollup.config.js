import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import babel from '@rollup/plugin-babel';

export default [{
  input: 'test-page/test-page.js',
  output: {
    file: 'test-page/test-page.bundle.js',
    format: 'umd',
    name: 'testPage',
    sourcemap: process.env.ROLLUP_WATCH
  },
  plugins: rollupPlugins()
}];

function rollupPlugins() {
  return [
    nodeResolve({
      preferBuiltins: true,
      browser: true
    }),
    commonjs({
      include: [
        'node_modules/**'
      ]
    }),
    json(),
    babel({
      babelHelpers: 'bundled',
      babelrc: false,
      presets: [['@babel/env', {
        modules: false,
        targets: {
          browsers: [
            '> 1%',
            'last 2 versions',
            'Firefox ESR'
          ]
        }
      }]]
    })
  ];
}
