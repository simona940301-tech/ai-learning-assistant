fn main() {
    prost_build::compile_protos(&["../../packages/proto/telemetry.proto"], &["../../packages/proto/"])
        .unwrap();
}
