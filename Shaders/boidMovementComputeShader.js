const computeShader = /*wgsl*/`
    struct Boid {
        pos: vec2<f32>,
        vel: vec2<f32>,
        speed: vec2<f32>,
    }

    struct CursorData {
        pos: vec2<f32>,
        power: vec2<f32>,
    }

    @group(0) @binding(0)
    var<storage, read> input: array<Boid>;
    @group(0) @binding(1)
    var<storage, read_write> output: array<Boid>;
    @group(0) @binding(2)
    var<storage, read> cursor: CursorData;

    override ratio: f32 = 1.0;

    @compute @workgroup_size(64)
    fn main( @builtin(global_invocation_id) global_id : vec3u, @builtin(local_invocation_id) local_id : vec3u) {
        // Avoid accessing the buffer out of bounds
        let index: u32 = global_id.x;
        let maxIndex: u32 = arrayLength(&output);
        if (index >= maxIndex) {
            return;
        }

        var next_vel: vec2<f32> = vec2(0.0);

        var align: vec2<f32> = vec2(0.0);
        var avoid: vec2<f32> = vec2(0.0);
        var flock: vec2<f32> = vec2(0.0);
        var cursorD: vec2<f32> = vec2(0.0);

        var count: f32 = 0;
        for (var i: u32 = 0; i < maxIndex; i++) {
            if index == i {continue;}
            var out: vec2<f32> =  input[index].pos - input[i].pos;
            var distSq = max(out.x * out.x + out.y * out.y, 0.000001);

            if distSq < 0.0001 {
                flock += input[i].pos;
                avoid += out / distSq;
                align += input[i].vel;
                count += 1.;
            }

        }

        var cursorAffects: bool = false;
        var diff: vec2<f32> = vec2(cursor.pos.x - input[index].pos.x, cursor.pos.y - input[index].pos.y);
        if (cursor.pos.x != -2) {
            cursorAffects = true;
            cursorD = normalize(diff);
        }

        if (length(avoid) != 0) {avoid = normalize(avoid);}
        if (length(align) != 0 && count != 0) {align = normalize(align / count);}
        if (length(flock) != 0 && count != 0) {flock = normalize(flock / count - input[index].pos);}

        next_vel = normalize(0.1 * (align + flock + 3 * avoid - cursor.power.x / 5 * cursorD) + input[index].vel);

        output[index].speed.x = updateSpeed(cursorAffects, length(diff));
        output[index].pos = stepPos(input[index]);
        output[index].vel = next_vel;
    }

    fn updateSpeed(extraPush: bool, dist: f32) -> f32 {
        var speed = 1.;
        if extraPush == true {
            speed += cursor.power.x / (dist * 0.8);
        }
        return speed;
    }

    fn stepPos(boid: Boid) -> vec2<f32> {
        let bound = 1.0;

        var next_pos: vec2<f32> = boid.pos + boid.speed.x * 0.002 * boid.vel;

        if next_pos.x > bound * ratio {
            next_pos.x = -bound * ratio;
        }
        if next_pos.x < -bound * ratio {
            next_pos.x = bound * ratio;
        }

        if next_pos.y > bound {
            next_pos.y = -bound;
        }
        if next_pos.y < -bound {
            next_pos.y = bound;
        }

        return next_pos;
    }
`;

export default computeShader;