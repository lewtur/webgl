// vertex shader program - position of stuff
// attributes change on each render, uniforms do not change
const vsSource = `
  attribute vec4 aVertexPosition;
  attribute vec4 aVertexColor;
  
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying lowp vec4 vColor;
  
  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
    vColor = aVertexColor;
  }
`;

// fragment shader program - color of stuff
// PARAM: changing the values here change the colour of whatever is drawn
const fsSource = `
  varying lowp vec4 vColor;

  void main() {
    gl_FragColor = vColor;
  }
`;

type ProgramInfo = {
  program: WebGLProgram;
  attribLocations: {
    vertexPosition: number;
    vertexColor: number;
  };
  uniformLocations: {
    projectionMatrix: WebGLUniformLocation | null;
    modelViewMatrix: WebGLUniformLocation | null;
  };
};

type Buffers = {
  positionBuffer: WebGLBuffer | null;
  colorBuffer: WebGLBuffer | null;
};

let squareRotation = 0.0;
let then = 0;

/**
 * Run the thing
 */
function main() {
  // get the canvas element
  const canvas = document.querySelector("#glCanvas") as HTMLCanvasElement;
  // initialise gl context
  const gl = canvas.getContext("webgl");

  // return if gl is not supported
  if (gl === null) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it."
    );
    return;
  }

  // create shader program
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  if (shaderProgram === null) {
    console.log("Failed to init shader program!");
    return;
  }

  // get program information from created program
  // these values correspond to the values set by the source code in vsSource
  const programInfo: ProgramInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
      vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(
        shaderProgram,
        "uProjectionMatrix"
      ),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
    },
  };

  const buffers = initBuffers(gl);

  function render(now: number) {
    now *= 0.001; // convert to seconds
    const deltaTime = now - then;
    then = now;

    if (gl !== null) {
      drawScene(gl, programInfo, buffers, deltaTime);
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

/**
 * Set the coordinate position of the thing to draw, assign it to a bugger, and assign that buffer to the
 * given gl context
 */
function initBuffers(gl: WebGLRenderingContext) {
  /**
   * position buffer
   */

  // create a buffer for the squares positions
  const positionBuffer = gl.createBuffer();

  // select the position buffer as the one to apply buffer operations to from here out
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // create an array of positions for the square
  // PARAM: changing the values here change the coordinates of each point drawn
  const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

  // pass the positions into WebGL to build the shape
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  /**
   * color buffer
   */

  // create array of colours, 4 per colour (RGBA)
  const colors = [
    1.0,
    1.0,
    1.0,
    1.0, // white
    1.0,
    0.0,
    0.0,
    1.0, // red
    0.0,
    1.0,
    0.0,
    1.0, // green
    0.0,
    0.0,
    1.0,
    1.0, // blue
  ];

  // create a new buffer
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  return {
    positionBuffer,
    colorBuffer,
  };
}

/**
 * Go through a lot of complicated settings and actually draw the scene
 */
function drawScene(
  gl: WebGLRenderingContext,
  programInfo: ProgramInfo,
  buffers: Buffers,
  deltaTime: number
) {
  // clear to black, fully opaque
  gl.clearColor(0.0, 0.0, 0.0, 1.0);

  // clear everything?
  gl.clearDepth(1.0);

  // enable depth testing?
  gl.enable(gl.DEPTH_TEST);

  // near things obscure far things
  gl.depthFunc(gl.LEQUAL);

  // clear the canvas (again ?!?)
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // PARAM: changing the value here changes how big the square is, i.e., a smaller FOV means the square
  // is more in your face
  const fieldOfView = (45 * Math.PI) / 180; // 45 degrees in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const zNear = 0.1;
  const zFar = 100.0;
  // @ts-ignore
  const projectionMatrix = mat4.create();
  // @ts-ignore
  mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

  // @ts-ignore
  const modelViewMatrix = mat4.create();
  // @ts-ignore
  mat4.translate(
    modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to translate
    // PARAM: changing the values here modifies [x, y, scale]
    [-0.0, 0.0, -6.0] // amount to translate
  );
  // @ts-ignore
  mat4.rotate(
    modelViewMatrix, // destination matrix
    modelViewMatrix, // matrix to rotate
    squareRotation, // amount to rotate in radians
    [0, 0, 1] // axis to rotate around
  );

  // position buffer
  {
    const numComponents = 2; // pull out 2 values per iteration
    const type = gl.FLOAT; // what the data in the buffer is
    const normalise = false; // don't normalise
    const stride = 0; // how many bytes to get from one set of values to the next
    const offset = 0; // how many bytes unside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.positionBuffer);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalise,
      stride,
      offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
  }

  // color buffer
  {
    const numComponents = 4; // pull out 4 values per iteration
    const type = gl.FLOAT; // what the data in the buffer is
    const normalise = false; // don't normalise
    const stride = 0; // how many bytes to get from one set of values to the next
    const offset = 0; // how many bytes unside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.colorBuffer);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexColor,
      numComponents,
      type,
      normalise,
      stride,
      offset
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
  }

  // tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // set the shader uniforms
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix
  );

  const offset = 0;
  const vertexCount = 4;
  // PARAM: changing values here change how the shape is drawn. pretty cool.
  // gl.POINTS just draws a dot at each vertex position
  // gl.LINE_STRIP draws a backwards 'Z' as it goes through each point one by one
  // gl.LINE_LOOP draws an hourglass - goes back to the start maybe>
  // gl.LINES draws an '=' sign, i.e. top and bottom lines
  // gl.TRIANGLE_STRIP draws the filled in square
  // gl.TRIANGLE_FAN draws a backwards square pacman (???)
  // gl.TRIANGLES draws '◹'
  gl.drawArrays(gl.TRIANGLE_STRIP, offset, vertexCount);

  // update rotation for next render
  squareRotation += deltaTime;
}

/**
 * Compile the vertex and fragment shader programs, create new program and assign them to it
 * @param gl the WebGL context
 * @param vsSource the source code of the vertex shader program
 * @param fsSource the source code of the fragment shader program
 */
function initShaderProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string
) {
  // compile the two shader programs
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (vertexShader === null || fragmentShader === null) {
    return null;
  }

  // create the full shader program
  const shaderProgram = gl.createProgram();
  if (shaderProgram === null) {
    console.log("Failed to create shader program!");
    return null;
  }
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // error if we failed to create the full program
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log("Failed to attach shaders to program!");
    console.log(gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
}

/**
 * Given the source code, compile the shader program and return it
 * @param gl the WebGL context
 * @param type type of shader being loaded
 * @param source the source code
 */
function loadShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  // create a new shader
  const shader = gl.createShader(type);
  if (shader === null) {
    throw new Error("Could not create shader!");
  }

  // assign the source code given to the shader
  gl.shaderSource(shader, source);

  // compile with the given source code
  gl.compileShader(shader);

  // see if the shader was able to compile
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log("Error compiling the shader!");
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

window.onload = main;
