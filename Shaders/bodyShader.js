const bodyShader = /*wgsl*/`
    struct VertexOutput {
        @builtin(position) position : vec4<f32>,
        @location(0) color : vec4<f32>,
    }

    @group(0) @binding(0)
    var<storage, read> colors: array<vec4<f32>>;

    override size: f32 = 0.05;
    override ratio: f32 = 1.;

    @vertex
    fn vert_main(
    @location(0) a_particlePos : vec2<f32>,
    @location(1) a_particleVel : vec2<f32>,
    @location(2) speed : vec2<f32>,
    @location(3) triangleVertexPos : vec2<f32>,
    @builtin(instance_index) index: u32,
    ) -> VertexOutput {
        let angle = -atan2(a_particleVel.x, a_particleVel.y);
        let pos = size * vec2(
            (triangleVertexPos.x * cos(angle)) - (triangleVertexPos.y * sin(angle)),
            (triangleVertexPos.x * sin(angle)) + (triangleVertexPos.y * cos(angle))
        );

        var red = smoothstep(1., 6., speed.x);

        var colorsLen = arrayLength(&colors);
        var output : VertexOutput;
        output.position = vec4((a_particlePos.x + pos.x) / ratio, a_particlePos.y + pos.y,  .0, 1.0);
        output.color = vec4(red + colors[index % colorsLen].x, colors[index % colorsLen].y, colors[index % colorsLen].z, 1.);
        return output;
    }
    
    @fragment
    fn frag_main(frag: VertexOutput) -> @location(0) vec4<f32> {
        return frag.color;
    }
`;

export default bodyShader;