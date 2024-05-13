import computeShader from './Shaders/boidMovementComputeShader.js';
import bodyShader from './Shaders/bodyShader.js';
import shadowShader from './Shaders/shadowShader.js';
import MAP, { distributeItems } from "./Map.js";

let COUNT, DEVICE, BOID_DATA, BUFFER_SIZE, boidShapeBuffer, output, input, commandEncoder, computePipeline, renderPipeline,renderPipeline1, computebindGroup, bodyBindGroup, shadowBindGroup, context, cursorBuffer, sunBuffer, colorBuffer;    

const clearColor = { r: 1., g: 1., b: 1., a: 1.0 };
const sunPostion = new Float32Array([0 , 0]);
const boidColors = new Float32Array([[ 54, 39, 41, 1], [0, 31, 84, 1], [3, 64, 120, 1], [18, 130, 162, 1], [238, 108, 77, 1]].flat().map(e => e / 255));
const boidShape = new Float32Array(generateArrowMesh(0.5).flat());


function generatePointerMesh() {
  return [[0, 1], [0.5, -0.5], [0, -0.2], [0, -0.2], [-0.5, -0.5], [0, 1]];
}

function generateArrowMesh() {
  return [ [-0.1, 0], [0.1, 0], [0.1, 1], 
    [-0.1, 0], [0.1, 1], [-0.1, 1], 
    [-0.1, 1], [0.1, 1], [0, 1.1], 
    [-0.4, 0.6], [-0.3, 0.6], [-0.4, 0.7], 
    [-0.3, 0.6], [-0.1, 0.8], [-0.1, 1], 
    [-0.3, 0.6], [-0.1, 1], [-0.4, 0.7], 
    [0.3, 0.6], [0.4, 0.6], [0.4, 0.7], 
    [0.3, 0.6], [0.1, 1], [0.1, 0.8], 
    [0.3, 0.6], [0.4, 0.7], [0.1, 1]].map(e => [e[0], e[1] - 0.55]);
}



function generateCircleMesh(radius = 1, numTriangles = 20) {
  const vertices = [];
  const indices = [];
  const PI = Math.PI;
  const angleIncrement = 2 * PI / numTriangles;

  // Loop for vertices
  for (let i = 0; i < numTriangles; i++) {
    const angle = i * angleIncrement;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    vertices.push([x, y]); // Push x, y, and z (0 for flat mesh)
  }
  vertices.push([0, 0])

  // Loop for triangle indices (assuming counter-clockwise winding)
  const firstIndex = numTriangles; // Index for the first vertex (center)
  for (let i = 0; i < numTriangles; i++) {
    const centerIndex = i;
    const nextIndex = (i + 1) % numTriangles;

    indices.push(vertices[centerIndex], vertices[nextIndex], vertices[firstIndex]);
  }

  return indices;
  // return {
  //   vertices,
  //   indices,
  // };
}

const renderPassDescriptor = {
  colorAttachments: [
    {
      clearValue: clearColor,
      loadOp: "load",
      storeOp: "store",
      view: null,
    },
  ],
};

const renderPassDescriptor1 = {
  colorAttachments: [
    {
      clearValue: clearColor,
      loadOp: "clear",
      storeOp: "store",
      view: null,
    },
  ],
};

export default async function init() {
  context = MAP.CANVAS.getContext("webgpu");
  if (!context) throw new Error('invalid context');

  COUNT = 5000;
  initData();
  await initGPU();
  const animate = async () => {
      await simulateStep();
      window.requestAnimationFrame(animate);
  }

  window.requestAnimationFrame(animate);
}

function initData() {    
  const positions = distributeItems(COUNT);
  BOID_DATA = new Float32Array(positions.flat());
}


async function initGPU() {
  if (!navigator.gpu) {
    throw Error("WebGPU not supported.");
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw Error("Couldn't request WebGPU ADAPTER.");
  }

  DEVICE = await adapter.requestDevice(); 

  context.configure({
    device: DEVICE,
    format: navigator.gpu.getPreferredCanvasFormat(),
    alphaMode: "premultiplied",
  });
  
  BUFFER_SIZE = BOID_DATA.byteLength;

  const computeShaderModule = DEVICE.createShaderModule({  label: 'compute', code: computeShader });
  const bodyShaderModule = DEVICE.createShaderModule({ label: 'body', code: bodyShader });
  const shadowShaderModule = DEVICE.createShaderModule({ label: 'shadow', code: shadowShader });
  
  cursorBuffer = DEVICE.createBuffer({
    size: MAP.CURSOR.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  sunBuffer = DEVICE.createBuffer({
    size: sunPostion.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  colorBuffer = DEVICE.createBuffer({
    size: boidColors.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  input = DEVICE.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.VERTEX | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  
  output = DEVICE.createBuffer({
      size: BUFFER_SIZE,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });

  boidShapeBuffer = DEVICE.createBuffer({
    size: boidShape.byteLength,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  }); 

  
  DEVICE.queue.writeBuffer(colorBuffer, 0, boidColors, 0, boidColors.length);
  DEVICE.queue.writeBuffer(boidShapeBuffer, 0, boidShape, 0, boidShape.length);
  DEVICE.queue.writeBuffer(input, 0, BOID_DATA, 0, BOID_DATA.length);
  
  const computeBindGroupLayout = DEVICE.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
        },
      },

      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "storage",
        },
      },

      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: {
          type: "read-only-storage",
        },
      },
    ],
  });
    
  computebindGroup = DEVICE.createBindGroup({
    layout: computeBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: input,
        },
      },

      {
        binding: 1,
        resource: {
          buffer: output,
        },
      },

      {
        binding: 2,
        resource: {
          buffer: cursorBuffer,
        },
      },
    ],
  });
  
  computePipeline = DEVICE.createComputePipeline({
      layout: DEVICE.createPipelineLayout({
        bindGroupLayouts: [computeBindGroupLayout],
      }),
      compute: {
        module: computeShaderModule,
        entryPoint: "main",
        constants: {
          ratio: MAP.RATIO
        }
      },
  });

  const bodyBindGroupLayout = DEVICE.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "read-only-storage",
        },
      }
    ]
  });
  
  bodyBindGroup = DEVICE.createBindGroup({
    layout: bodyBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: colorBuffer,
        },
      },
    ]
  });

  
  renderPipeline = DEVICE.createRenderPipeline({
    layout: DEVICE.createPipelineLayout({
      bindGroupLayouts: [bodyBindGroupLayout],
    }),
    vertex: {
      module: bodyShaderModule,
      constants: {
        ratio: MAP.RATIO,
      },
      buffers: [
        {
          arrayStride: 24,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
            {
              shaderLocation: 1,
              offset: 8,
              format: 'float32x2',
            },
            {
              shaderLocation: 2,
              offset: 16,
              format: 'float32x2',
            },
          ],
        },
        {
          arrayStride: 8,
          stepMode: 'vertex',
          attributes: [
            {
              shaderLocation: 3,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: bodyShaderModule,
      targets: [ { format: navigator.gpu.getPreferredCanvasFormat() } ],
    },
    primitive: {
      topology: 'triangle-list',
    },
  });

  const shadowBindGroupLayout = DEVICE.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: {
          type: "read-only-storage",
        },
      }
    ]
  });
  
  shadowBindGroup = DEVICE.createBindGroup({
    layout: shadowBindGroupLayout,
    entries: [
      {
        binding: 0,
        resource: {
          buffer: sunBuffer,
        },
      },
    ]
  });

  renderPipeline1 = DEVICE.createRenderPipeline({
    layout: DEVICE.createPipelineLayout({
      bindGroupLayouts: [shadowBindGroupLayout],
    }),
    vertex: {
      module: shadowShaderModule,
      constants: {
        ratio: MAP.RATIO,
      },
      buffers: [
        {
          arrayStride: 24,
          stepMode: 'instance',
          attributes: [
            {
              shaderLocation: 0,
              offset: 0,
              format: 'float32x2',
            },
            {
              shaderLocation: 1,
              offset: 8,
              format: 'float32x2',
            },
          ],
        },
        {
          arrayStride: 8,
          stepMode: 'vertex',
          attributes: [
            {
              shaderLocation: 2,
              offset: 0,
              format: 'float32x2',
            },
          ],
        },
      ],
    },
    fragment: {
      module: shadowShaderModule,
      targets: [
        {
          format: navigator.gpu.getPreferredCanvasFormat(),
        },
      ],
    }
  });
}

function updateSunPositon() {

}


export async function simulateStep() {
    updateSunPositon();
    DEVICE.queue.writeBuffer(cursorBuffer, 0, MAP.CURSOR, 0, MAP.CURSOR.length);
    DEVICE.queue.writeBuffer(sunBuffer, 0, sunPostion, 0, sunPostion.length);

    renderPassDescriptor.colorAttachments[0].view = context.getCurrentTexture().createView();
    renderPassDescriptor1.colorAttachments[0].view = context.getCurrentTexture().createView();

    commandEncoder = DEVICE.createCommandEncoder();
    
    let passEncoder = commandEncoder.beginComputePass();
    
    passEncoder.setPipeline(computePipeline);
    passEncoder.setBindGroup(0, computebindGroup);
    passEncoder.dispatchWorkgroups(Math.ceil(COUNT / 64));
    passEncoder.end();

    passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor1);
    passEncoder.setPipeline(renderPipeline1);
    passEncoder.setBindGroup(0, shadowBindGroup);
    passEncoder.setVertexBuffer(0, input);
    passEncoder.setVertexBuffer(1, boidShapeBuffer);
    passEncoder.draw(boidShape.length / 2, COUNT, 0, 0);
    passEncoder.end();


    passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
    passEncoder.setPipeline(renderPipeline);
    passEncoder.setBindGroup(0, bodyBindGroup);
    passEncoder.setVertexBuffer(0, input);
    passEncoder.setVertexBuffer(1, boidShapeBuffer);
    passEncoder.draw(boidShape.length / 2, COUNT, 0, 0);
    passEncoder.end();
  
    commandEncoder.copyBufferToBuffer(
        output,
        0, // Source offset
        input,
        0, // Destination offset
        BUFFER_SIZE,
    );
    
    DEVICE.queue.submit([commandEncoder.finish()]);
}
