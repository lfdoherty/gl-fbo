var shell = require("gl-now")()
var createFBO = require("../fbo.js")
var glslify = require("glslify")
var fillScreen = require("@lfdoherty/fast-big-triangle")

var createUpdateShader = glslify({
  vertex: "\
    attribute vec2 position;\
    varying vec2 uv;\
    void main() {\
      gl_Position = vec4(position,0.0,1.0);\
      uv = 0.5 * (position+1.0);\
    }",
  fragment: "\
    precision mediump float;\
    uniform sampler2D buffer;\
    uniform vec2 dims;\
    varying vec2 uv;\
    void main() {\
      float n = 0.0;\
      for(int dx=-1; dx<=1; ++dx)\
      for(int dy=-1; dy<=1; ++dy) {\
        n += texture2D(buffer, uv+vec2(dx,dy)/dims).r;\
      }\
      float s = texture2D(buffer, uv).r;\
      if(n > 3.0+s || n < 3.0) {\
        gl_FragColor = vec4(0,0,0,1);\
      } else {\
        gl_FragColor = vec4(1,1,1,1);\
      }\
    }",
  inline: true
})

var createDrawShader = glslify({
  vertex: "\
    attribute vec2 position;\
    varying vec2 uv;\
    void main() {\
      gl_Position = vec4(position,0.0,1.0);\
      uv = 0.5 * (position+1.0);\
    }",
  fragment: "\
    precision mediump float;\
    uniform sampler2D buffer;\
    varying vec2 uv;\
    void main() {\
      gl_FragColor = texture2D(buffer, uv);\
    }",
  inline: true
})

var state, updateShader, drawShader, current = 0

shell.on("gl-init", function() {
  var gl = shell.gl
  
  //Turn off depth test
  gl.disable(gl.DEPTH_TEST)

  //Initialize shaders
  updateShader = createUpdateShader(gl)
  drawShader = createDrawShader(gl)

  //Allocate buffers
  state = [ createFBO(gl, [512, 512]), createFBO(gl, [512, 512]) ]
  
  //Initialize state buffer
  var initial_conditions = new Uint8Array(512*512*4);//, [512, 512, 4])
  /*fill(initial_conditions, function(x,y,c) {
    if(c === 3) {
      return 255
    }
    return Math.random() > 0.9 ? 255 : 0
  })*/
  let i=0;
  for(let x=0;x<512;++x){
    for(let y=0;y<512;++y){
      initial_conditions[i++] = Math.random() > 0.9 ? 255 : 0
      initial_conditions[i++] = Math.random() > 0.9 ? 255 : 0
      initial_conditions[i++] = Math.random() > 0.9 ? 255 : 0
      initial_conditions[i++] = 255
    }
  }
  state[0].color[0].setData(initial_conditions)
  
  //Set up vertex pointers
  drawShader.attributes.position.location = updateShader.attributes.position.location = 0
})

shell.on("tick", function() {
  var gl = shell.gl
  var prevState = state[current]
  var curState = state[current ^= 1]

  //Switch to state fbo
  curState.bind()
  
  //Run update shader
  updateShader.bind()
  updateShader.uniforms.buffer = prevState.color[0].bind()
  updateShader.uniforms.dims = prevState.shape
  fillScreen(gl)
})

shell.on("gl-render", function(t) {
  var gl = shell.gl
  
  //Render contents of buffer to screen
  drawShader.bind()
  drawShader.uniforms.buffer = state[current].color[0].bind()
  fillScreen(gl)
})
