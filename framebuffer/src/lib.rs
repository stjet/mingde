use neon::prelude::*;

fn write_frame(mut cx: FunctionContext) -> JsResult<JsNumber> {
  //placeholder
  //
  Ok(cx.number(0.0))
}

#[neon::main]
fn main(mut cx: ModuleContext) -> NeonResult<()> {
  cx.export_function("write_frame", write_frame)?;
  Ok(())
}

