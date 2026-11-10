// 用 macOS 自带 Vision 人像分割逐帧出遮罩，灰度 raw 帧写到 stdout，交给 ffmpeg 合成。
// 用法: swift person_matte.swift <输入视频> <输出宽> <输出高> [accurate|balanced|fast]
import AVFoundation
import Vision
import CoreImage
import Foundation

let args = CommandLine.arguments
guard args.count >= 4, let W = Int(args[2]), let H = Int(args[3]) else {
  FileHandle.standardError.write("用法: person_matte.swift <视频> <宽> <高> [accurate|balanced|fast]\n".data(using: .utf8)!)
  exit(2)
}
let quality: VNGeneratePersonSegmentationRequest.QualityLevel = {
  switch args.count > 4 ? args[4] : "balanced" {
  case "accurate": return .accurate
  case "fast": return .fast
  default: return .balanced
  }
}()
let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let track = asset.tracks(withMediaType: .video)[0]
let reader = try! AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
out.alwaysCopiesSampleData = false
reader.add(out)
reader.startReading()
let ctx = CIContext(options: [.useSoftwareRenderer: false])
let req = VNGeneratePersonSegmentationRequest()
req.qualityLevel = quality
req.outputPixelFormat = kCVPixelFormatType_OneComponent8
var buf = [UInt8](repeating: 0, count: W * H)
let stdout = FileHandle.standardOutput
var n = 0
while let sb = out.copyNextSampleBuffer() {
  guard let pb = CMSampleBufferGetImageBuffer(sb) else { continue }
  let handler = VNImageRequestHandler(cvPixelBuffer: pb, options: [:])
  try? handler.perform([req])
  if let mask = req.results?.first?.pixelBuffer {
    let img = CIImage(cvPixelBuffer: mask)
    let sx = CGFloat(W) / img.extent.width, sy = CGFloat(H) / img.extent.height
    let scaled = img.transformed(by: CGAffineTransform(scaleX: sx, y: sy))
    ctx.render(scaled, toBitmap: &buf, rowBytes: W, bounds: CGRect(x: 0, y: 0, width: W, height: H), format: .L8, colorSpace: nil)
  } else {
    for i in 0..<buf.count { buf[i] = 0 }
  }
  stdout.write(Data(buf))
  n += 1
  if n % 300 == 0 { FileHandle.standardError.write("matte \(n) 帧\n".data(using: .utf8)!) }
}
FileHandle.standardError.write("matte 完成 \(n) 帧\n".data(using: .utf8)!)
