// tiny gltf reader
//
// limitations:
//
// NO SPARSE accessors support
// ONLY meshes supported, NO materials, nodes, etc
// ONLY some attributes supported

// field type
const TYPE_SCALAR = "SCALAR";
const TYPE_VEC2 = "VEC2";
const TYPE_VEC3 = "VEC3";
const TYPE_VEC4 = "VEC4";
const TYPE_MAT2 = "MAT2";
const TYPE_MAT3 = "MAT3";
const TYPE_MAT4 = "MAT4";

//export { TYPE_SCALAR, TYPE_VEC2, TYPE_VEC3, TYPE_VEC4, TYPE_MAT2, TYPE_MAT3, TYPE_MAT4 };

export const typeToCount = {
    "SCALAR": 1,
    "VEC2": 2,
    "VEC3": 3,
    "VEC4": 4,
    "MAT2": 4,
    "MAT3": 9,
    "MAT4": 16
};

const ATTR_POS = "POSITION";
const ATTR_NOR = "NORMAL";
const ATTR_TAN = "TANGENT";
const ATTR_TC0 = "TEXCOORD_0";
const ATTR_TC1 = "TEXCOORD_1";
const ATTR_COL = "COLOR_0";
const ATTR_JNT = "JOINTS_0";
const ATTR_WGT = "WEIGHT_0";

//export { ATTR_POS, ATTR_NOR, ATTR_TAN, ATTR_TC0, ATTR_TC1, ATTR_COL, ATTR_JNT, ATTR_WGT };

// returns render function
export default async function createGltf(gl, url, attrMapping) {
    let prog = gl.getParameter(gl.CURRENT_PROGRAM);
    
    let json = await (await fetch(url)).json();

    console.log(json);

    let { buffers, meshes, accessors, bufferViews } = json;

    // convert data-uris into array buffers and load into VBO
    for(let buf of buffers) {
        let arrBuf = await (await (await fetch(buf.uri)).blob()).arrayBuffer();
        
        let vbo = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, new Uint8Array(arrBuf), gl.STATIC_DRAW);

        buf.vbo = vbo;
        buf.arr = arrBuf;
    }

    let renderFunction;
    let mapping = [];

    // parse meshes
    for(var m of meshes) {
        console.log("parsing mesh:", m);
        for(var p of m.primitives) {
            console.log("parsing primitive:", p);
            for(var attr in p.attributes) {
                console.log(attr);
                let attrIdx = p.attributes[attr];

                let attrAccessor = accessors[attrIdx];
                let { buffer, byteLength, byteOffset } = bufferViews[attrAccessor.bufferView];

                let buf = buffers[buffer];

                if(!attrMapping[attr]) {
                    console.log("skipping unmapped attribute", attr);
                    continue;
                } else {
                    console.log("mapping attr", attr, "to", attrMapping[attr]);
                }

                let glAttr = gl.getAttribLocation(prog, attrMapping[attr]);
                if(glAttr === -1) {
                    console.warn("Not found attribute mapping using default", attr);
                    glAttr = attr;
                }

                /*gl.enableVertexAttribArray(glAttr);
                let count = typeToCount[attrAccessor.type];
                console.log("count", count, "for type", attrAccessor.type, "of attr", glAttr);
                gl.vertexAttribPointer(glAttr, typeToCount[attrAccessor.type], attrAccessor.componentType, false, 0, byteOffset);*/
                let map = {
                    buffer: buf.vbo,
                    attr: glAttr,
                    count: typeToCount[attrAccessor.type],
                    type: attrAccessor.componentType,
                    offset: byteOffset
                };
                mapping.push(map);
            }

            let indIdx = p.indices;
            if(indIdx === undefined) {
                console.log("drawArrays not supported");
            }
            let indAccessor = accessors[indIdx];
            let indView = bufferViews[indAccessor.bufferView];

            let ibo = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint8Array(buffers[indView.buffer].arr, indView.byteOffset, indView.byteLength), gl.STATIC_DRAW);

            let count  = indAccessor.count;
            let type = indAccessor.componentType;

            let mode = (p.mode !== undefined)?p.mode:gl.TRIANGLES;

            renderFunction = () => {
                mapping.forEach((m) => {
                    gl.enableVertexAttribArray(m.attr);
                    gl.bindBuffer(gl.ARRAY_BUFFER, m.buffer);
                    gl.vertexAttribPointer(m.attr, m.count, m.type, false, 0, m.offset);
                });
                
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
                gl.drawElements(gl.TRIANGLES, count, type, 0);
            };
        }
    }
    return renderFunction;
}
