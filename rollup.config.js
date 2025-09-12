import commonjs from '@rollup/plugin-commonjs'; // To convert CommonJS modules to ES6
import { nodeResolve } from '@rollup/plugin-node-resolve'; // To resolve Node.js modules
import replace from '@rollup/plugin-replace';

const commonConfig = {
    input: 'src/index.js',
    plugins: [
        replace({
            delimiters: ['', ''],
            preventAssignment: true,
            values: {
                '../../data': '../data',
                '../../../../data': '../data'
            }
        }),
        nodeResolve(),
        commonjs()
    ],
    external: ['@toondepauw/node-zstd']
};

export default [
    // CJS output
    {
        ...commonConfig,
        output: {
            exports: 'named',
            file: 'dist/index.cjs',
            format: 'cjs',
            sourcemap: true
        }
    },
    // ESM output
    {
        ...commonConfig,
        output: {
            file: 'dist/index.mjs',
            format: 'esm',
            sourcemap: true
        }
    }
];
