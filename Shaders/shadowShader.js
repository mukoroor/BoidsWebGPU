const shadowShader = /*wgsl*/`
    struct SunData {
        pos: vec2<f32>,
    }

    override size: f32 = 0.04;
    override ratio: f32 = 1.;

    @group(0) @binding(0)
    var<storage, read> sun: SunData;

    @vertex
    fn vert_line(
    @location(0) a_particlePos : vec2<f32>,
    @location(1) a_particleVel : vec2<f32>,
    @location(2) triangleVertexPos : vec2<f32>
    ) -> @builtin(position) vec4<f32> {
        let angle = -atan2(a_particleVel.x, a_particleVel.y);
        let pos = size * 1.005 * vec2(
            (triangleVertexPos.x * cos(angle)) - (triangleVertexPos.y * sin(angle)),
            (triangleVertexPos.x * sin(angle)) + (triangleVertexPos.y * cos(angle))
        );

        var shadowOff: vec2<f32> = 0.01 * normalize(a_particlePos - sun.pos);
        return vec4((a_particlePos.x + pos.x + shadowOff.x) / ratio, a_particlePos.y + pos.y + shadowOff.y,  .0, 1.);   
    }

    @fragment
    fn frag_line() -> @location(0) vec4<f32> {
        return vec4(0., 0., 0., 0.1);
    }
`;

export default shadowShader;