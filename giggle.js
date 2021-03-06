// support multiple canvases
let contexts = {};

// support functions
export let utils = {
    getScriptText(id) {
        return document.getElementById(id).text;
    },
    createShader(gl, type, src) {
        var sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if(!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
            console.error("createShader error:", gl.getShaderInfoLog(sh), src);
        }
        return sh;
    },
    createProgram(gl, vertexSource, fragmentSource) {
        let prog = gl.createProgram();
        let vert = utils.createShader(gl, gl.VERTEX_SHADER, vertexSource);
        let frag = utils.createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
        gl.attachShader(prog, vert);
        gl.attachShader(prog, frag);
        gl.linkProgram(prog);
        //gl.validateProgram(prog);

        if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
            console.error("Link status: ", gl.getProgramInfoLog(prog));
        }

        gl.useProgram(prog);
        return prog;
    },
    createOrtho(l, r, b, t, n, f) {
        return [    // as in gl specs
            2/(r-l), 0, 0, 0,
            0, 2/(t-b), 0, 0,
            0, 0, -2/(f-n), 0,
            -(r+l)/(r-l), -(t+b)/(t-b), -(f+n)/(f-n), 1
        ];
    }
};

// context creation tool (note that you can always get the canvas from gl context)
export function get(id, contextType_opt, contextSettings_opt) {
    if(contexts[id])
        return contexts[id];
    const canvas = document.getElementById(id);
    const gl = canvas.getContext(contextType_opt || "webgl", contextSettings_opt);
    contexts[id] = new Promise((resolve, reject)=>{
        resolve(gl);
    });
    return contexts[id];
}