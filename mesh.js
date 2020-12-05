function getType(typedArray) {
    switch(typedArray.constructor /*.name*/ ) {
        case Int8Array:
            return WebGLRenderingContext.BYTE;
        case Int16Array:
            return WebGLRenderingContext.SHORT
        case Uint8Array:
            return WebGLRenderingContext.UNSIGNED_BYTE;
        case Uint16Array:
            return WebGLRenderingContext.UNSIGNED_SHORT;
        case Float32Array:
        default:
            break;
    }
    return WebGLRenderingContext.FLOAT;
}

function isNormalized(type) {
    switch(type) {
        case WebGLRenderingContext.UNSIGNED_BYTE:
        case WebGLRenderingContext.UNSIGNED_SHORT:
            return true;    // pretend to be classic opengl with byte values input for colors etc
    }
    return false;
}

// returns render function
export default function createMesh(gl, mode, count, attrNameToArray, indices_opt) {
    let buffers = {}, ibo = null;

    for(let attr in attrNameToArray) {
        let values = attrNameToArray[attr];
        let type = getType(values);

        let vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, (values.constructor != Array)?values:new Float32Array(values), gl.STATIC_DRAW);

        buffers[attr] = { vbo, type };
    }

    if(indices_opt) {
        ibo = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint32Array(indices_opt), gl.STATIC_DRAW);
    }

    // ensure uint index support
    var ext = gl.getExtension('OES_element_index_uint');

    return () => {
        let prog = gl.getParameter(gl.CURRENT_PROGRAM);

        for(let attr in buffers) {
            let id = gl.getAttribLocation(prog, attr);
            
            gl.enableVertexAttribArray(id);
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers[attr].vbo);
            let size = attrNameToArray[attr].length/count; // get attrib size from total values and rendered count
            gl.vertexAttribPointer(id, size, buffers[attr].type, isNormalized(buffers[attr].type), 0, 0);
        }

        if(!indices_opt && !ibo) {
            gl.drawArrays(mode, 0, count);
        } else {
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
            gl.drawElements(mode, count, gl.UNSIGNED_INT, 0);
        }
    };
}
