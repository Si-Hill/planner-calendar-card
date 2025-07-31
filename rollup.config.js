import resolve from 'rollup-plugin-node-resolve';
import typescript from 'rollup-plugin-typescript2';
import { terser } from 'rollup-plugin-terser';

export default {
    input: 'src/planner-calendar-card.ts',
    output: {
        file: 'dist/planner-calendar-card.js',
        format: 'es'
    },
    plugins: [
        resolve(),
        typescript(),
        terser()
    ]
};
