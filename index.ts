// vertex shader program
// attributes change on each render, uniforms do not change
const vsSource = `
  attribute vec4 aVertexPosition;
  
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  
  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
  }
`;

// fragment shader program
// PARAM: changing the values here change the colour of whatever is drawn
const fsSource = `
  void main() {
    gl_FragColor = vec4(0.0, 1.0, 1.0, 1.0);
  }
`;

type ProgramInfo = {
  program: WebGLProgram;
  attribLocations: {
    vertexPosition: number;
  };
  uniformLocations: {
    projectionMatrix: WebGLUniformLocation | null;
    modelViewMatrix: WebGLUniformLocation | null;
  }
}

/**
 * Run the thing
 */
function main() {
  // get the canvas element
  const canvas = document.querySelector('#glCanvas') as HTMLCanvasElement;
  // initialise gl context
  const gl = canvas.getContext('webgl');

  // return if gl is not supported
  if (gl === null) {
    alert("Unable to initialize WebGL. Your browser or machine may not support it.");
    return;
  }

  // create shader program
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  if (shaderProgram === null) {
    console.log('Failed to init shader program!');
    return;
  }

  // get program information from created program
  // these values correspond to the values set by the source code in vsSource
  const programInfo: ProgramInfo = {
    program: shaderProgram,
    attribLocations: {
      vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
    },
    uniformLocations: {
      projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
      modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
    }
  };

  initBuffers(gl);

  drawScene(gl, programInfo);
}

/**
 * Set the coordinate position of the thing to draw, assign it to a bugger, and assign that buffer to the
 * given gl context
 */
function initBuffers(gl: WebGLRenderingContext) {
  // create a buffer for the squares positions
  const positionBuffer = gl.createBuffer();

  // selection the position buffer as the one to apply buffer operations to from here out
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

  // create an array of positions for the square
  // PARAM: changing the values here change the coordinates of each point drawn
  const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];

  // pass the positions into WebGL to build the shape
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  return positionBuffer;
}

/**
 * Go through a lot of complicated settings and actually draw the scene
 */
function drawScene(gl: WebGLRenderingContext, programInfo: ProgramInfo) {
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
  mat4.perspective(projectionMatrix,
    fieldOfView,
    aspect,
    zNear,
    zFar
  );

  // @ts-ignore
  const modelViewMatrix = mat4.create();
  // @ts-ignore
  mat4.translate(
    modelViewMatrix,   // destination matrix
    modelViewMatrix,   // matrix to translate
    // PARAM: changing the values here modifies [x, y, scale]
    [0.0, 0.0, -6.0], // amount to translate
  );

  // tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute

  const numComponents = 2; // pull out 2 values per iteration
  const type = gl.FLOAT; // what the data in the buffer is
  const normalise = false; // don't normalise
  const stride = 0; // how many bytes to get from one set of values to the next
  const vertexPositionOffset = 0; // how many bytes unside the buffer to start from
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexPosition,
    numComponents,
    type,
    normalise,
    stride,
    vertexPositionOffset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

  // tell WebGL to use our program when drawing
  gl.useProgram(programInfo.program);

  // set the shader uniforms
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.projectionMatrix,
    false,
    projectionMatrix,
  );
  gl.uniformMatrix4fv(
    programInfo.uniformLocations.modelViewMatrix,
    false,
    modelViewMatrix,
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
}

/**
 * Compile the vertex and fragment shader programs, create new program and assign them to it
 * @param gl the WebGL context
 * @param vsSource the source code of the vertex shader program
 * @param fsSource the source code of the fragment shader program
 */
function initShaderProgram(gl: WebGLRenderingContext, vsSource: string, fsSource: string) {
  // compile the two shader programs
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  if (vertexShader === null || fragmentShader === null) {
    return null;
  }

  // create the full shader program
  const shaderProgram = gl.createProgram();
  if (shaderProgram === null) {
    console.log('Failed to create shader program!');
    return null;
  }
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // error if we failed to create the full program
  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.log('Failed to attach shaders to program!')
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
function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  // create a new shader
  const shader = gl.createShader(type)
  if (shader === null) {
    throw new Error('Could not create shader!');
  }

  // assign the source code given to the shader
  gl.shaderSource(shader, source);

  // compile with the given source code
  gl.compileShader(shader);

  // see if the shader was able to compile
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.log('Error compiling the shader!');
    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

window.onload = main;
